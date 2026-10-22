"""Operational contracts: authentication, frozen cohorts, audit and honest inference."""
import unittest
from unittest.mock import patch
from web.app import app


class OperationsTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        result = self.client.post('/api/v1/auth/login', json={'username': 'admin', 'password': 'admin123'})
        self.headers = {'Authorization': 'Bearer ' + result.json['token']}

    def create(self, kind, payload):
        return self.client.post('/api/v1/operations/items', headers=self.headers, json={'kind': kind, 'payload': payload})

    def test_requires_auth(self):
        self.assertEqual(self.client.get('/api/v1/operations/items').status_code, 401)
        self.assertEqual(self.client.post('/api/v1/operations/campaigns/1', json={}).status_code, 401)

    def test_quality_reports_real_coverage(self):
        result = self.client.get('/api/v1/operations/quality')
        self.assertEqual(result.status_code, 200)
        self.assertGreater(result.json['records'], 0)
        self.assertLessEqual(result.json['prediction_coverage'], result.json['records'])
        self.assertIn('timestamp_meaning', result.json)

    def test_action_snapshot_update_and_audit(self):
        result = self.create('action', {'name': 'Follow up', 'segment': 'Champions', 'owner': 'analyst', 'follow_up': '2027-01-01'})
        self.assertEqual(result.status_code, 201)
        item_id = result.json['id']
        result = self.client.patch(f'/api/v1/operations/items/{item_id}', headers=self.headers, json={'status': 'done', 'notes': 'Reviewed'})
        self.assertEqual(result.status_code, 200)
        items = self.client.get('/api/v1/operations/items', headers=self.headers).json['items']
        item = next(r for r in items if r['id'] == item_id)
        self.assertTrue(item['payload']['customer_ids'])
        self.assertEqual(item['payload']['status'], 'done')
        audit = self.client.get(f'/api/v1/operations/items/{item_id}/audit', headers=self.headers).json
        self.assertEqual(len(audit['events']), 2)

    def test_item_isolation(self):
        result = self.create('filter', {'name': 'My filter', 'status': 'open'})
        other = self.client.post('/api/v1/auth/login', json={'username': 'analyst', 'password': 'analyst123'})
        headers = {'Authorization': 'Bearer '+other.json['token']}
        response = self.client.patch('/api/v1/operations/items/'+str(result.json['id']), headers=headers, json={'status': 'done'})
        self.assertEqual(response.status_code, 404)
        audit = self.client.get(f"/api/v1/operations/items/{result.json['id']}/audit", headers=headers)
        self.assertEqual(audit.json['events'], [])

    def test_invalid_followup_and_status(self):
        for payload in ({'name': 'Invalid', 'follow_up': 'tomorrow'}, {'name': 'Invalid', 'status': 'unknown'}):
            self.assertEqual(self.create('action', payload).status_code, 400)

    def test_cohort_membership_cannot_be_rewritten(self):
        result = self.create('action', {'name': 'Frozen', 'segment': 'Champions', 'owner': 'analyst'})
        self.assertEqual(result.status_code, 201)
        response = self.client.patch(f"/api/v1/operations/items/{result.json['id']}", headers=self.headers, json={'customer_ids': ['not-a-member']})
        self.assertEqual(response.status_code, 400)

    def test_measured_lift_requires_complete_observations(self):
        from web.db import get_db_connection
        result = self.create('campaign', {'name': 'Measured cohort', 'segment': 'Champions', 'intervention': 'Call', 'outcome_definition': '30-day net revenue'})
        campaign_id = result.json['id']
        # Synthetic observations in the disposable test database, never production results.
        with get_db_connection() as conn:
            conn.execute("UPDATE campaign_members SET outcome_recorded=1,revenue=CASE WHEN arm='treatment' THEN 20 ELSE 10 END WHERE campaign_id=?", (campaign_id,))
        report = self.client.get(f'/api/v1/operations/campaigns/{campaign_id}', headers=self.headers).json
        treatment = next(a for a in report['arms'] if a['arm'] == 'treatment')
        self.assertEqual(report['incremental_revenue'], treatment['members'] * 10)
        self.assertIn('manual attribution review', report['measurement_status'])

    def test_campaign_control_idempotent_outcomes_and_insufficient_evidence(self):
        result = self.create('campaign', {'name': 'Retention', 'segment': 'Champions', 'intervention': 'Call', 'outcome_definition': 'Purchase within 30 days, net revenue'})
        self.assertEqual(result.status_code, 201)
        url = '/api/v1/operations/campaigns/'+str(result.json['id'])
        report = self.client.get(url, headers=self.headers).json
        self.assertIsNone(report['incremental_revenue'])
        self.assertTrue(all(r['conversion_rate'] is None for r in report['arms']))
        control = next(m for m in report['members'] if m['arm'] == 'control')
        self.assertEqual(self.client.post(url, headers=self.headers, json={'customer_id': control['customer_id'], 'contacted': 1}).status_code, 400)
        member = next(m for m in report['members'] if m['arm'] == 'treatment')
        payload = {'customer_id': member['customer_id'], 'contacted': 1, 'converted': 1, 'revenue': 20, 'cost': 2}
        for _ in range(2):
            result = self.client.post(url, headers=self.headers, json=payload)
            self.assertEqual(result.status_code, 200)
        treatment = next(a for a in result.json['arms'] if a['arm'] == 'treatment')
        self.assertEqual(treatment['revenue'], 20)
        self.assertEqual(treatment['observed'], 1)
        self.assertIsNone(result.json['incremental_revenue'])
        self.assertEqual(len(result.json['audit']), 3)
        self.assertEqual(self.client.post(url, headers=self.headers, json={**payload, 'cost': -1}).status_code, 400)

    def test_failed_inference_has_no_estimated_values(self):
        with patch('web.app.get_models', return_value={}):
            result = self.client.post('/api/predict', json={'recency_days': 10, 'frequency': 3, 'total_spend': 100})
        self.assertEqual(result.status_code, 503)
        self.assertEqual(result.json['inference_status'], 'unavailable')
        self.assertIsNone(result.json['predicted_clv'])
        self.assertIsNone(result.json['churn_probability'])

    def test_successful_inference_is_auditable(self):
        result = self.client.post('/api/predict', json={'recency_days': 10, 'frequency': 3, 'total_spend': 100})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json['inference_status'], 'available')
        self.assertEqual(len(result.json['model_versions']['clv']), 64)
        self.assertEqual(result.json['feature_inputs']['frequency'], 3)
        self.assertEqual({d['model'] for d in result.json['drivers']}, {'clv', 'churn'})

    def test_invalid_prediction_payload(self):
        for payload in ([], {'total_spend': float('inf')}, {'frequency': float('inf')}):
            self.assertEqual(self.client.post('/api/predict', json=payload).status_code, 400)


if __name__ == '__main__':
    unittest.main()
