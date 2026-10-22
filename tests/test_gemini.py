"""Gemini contract checks use mocked provider responses, never real credentials."""
import json
import os
import unittest
from unittest.mock import Mock, patch
import requests
from web.app import app


class GeminiTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        token = self.client.post('/api/v1/auth/login', json={'username': 'admin', 'password': 'admin123'}).json['token']
        self.headers = {'Authorization': 'Bearer ' + token}
        self.inputs = {'recency_days': 25, 'frequency': 6, 'total_spend': 1250, 'tenure_days': 300}
        self.environment = patch.dict(os.environ, {'GEMINI_API_KEY': 'test-only-key', 'GEMINI_MODEL': 'gemini-2.5-flash'})
        self.environment.start()
        self.addCleanup(self.environment.stop)

    def post(self, payload=None):
        return self.client.post('/api/v1/operations/explain-prediction', headers=self.headers, json=self.inputs if payload is None else payload)

    def provider_response(self, refs=None):
        response = Mock()
        response.json.return_value = {'candidates': [{'finishReason': 'STOP', 'content': {'parts': [{'text': json.dumps({
            'summary': 'The computed inputs and trained prediction are available. Global importance is not causal attribution.',
            'evidence_refs': refs if refs is not None else ['prediction', 'feature_inputs'],
        })}]}}]}
        return response

    @patch('web.gemini.requests.post')
    def test_requires_authentication(self, upstream):
        result = self.client.post('/api/v1/operations/explain-prediction', json=self.inputs)
        self.assertEqual(result.status_code, 401)
        upstream.assert_not_called()

    @patch('web.gemini.requests.post')
    def test_missing_key_is_honest_unavailable(self, upstream):
        with patch.dict(os.environ, {'GEMINI_API_KEY': ''}):
            result = self.post()
        self.assertEqual(result.status_code, 503)
        self.assertIn('not configured', result.json['error'])
        upstream.assert_not_called()

    @patch('web.gemini.requests.post')
    def test_only_recomputed_nonidentifying_evidence_is_sent(self, upstream):
        upstream.return_value = self.provider_response()
        result = self.post({**self.inputs, 'customer_id': 'private-id', 'notes': 'private-note', 'predicted_clv': 999999})
        self.assertEqual(result.status_code, 200)
        sent = upstream.call_args.kwargs
        encoded = json.dumps(sent['json'])
        self.assertNotIn('private-id', encoded)
        self.assertNotIn('private-note', encoded)
        self.assertNotIn('999999', encoded)
        self.assertNotIn('test-only-key', result.get_data(as_text=True))
        self.assertEqual(sent['headers']['x-goog-api-key'], 'test-only-key')
        self.assertEqual(result.json['evidence']['feature_inputs']['frequency'], 6)
        self.assertEqual(result.json['evidence_refs'], ['prediction', 'feature_inputs'])

    @patch('web.gemini.requests.post')
    def test_provider_error_does_not_expose_details(self, upstream):
        upstream.side_effect = requests.Timeout('sensitive upstream details')
        result = self.post()
        self.assertEqual(result.status_code, 503)
        self.assertNotIn('sensitive', result.get_data(as_text=True))
        self.assertNotIn('test-only-key', result.get_data(as_text=True))

    @patch('web.gemini.requests.post')
    def test_unknown_evidence_is_rejected(self, upstream):
        upstream.return_value = self.provider_response(['invented_campaign_returns'])
        self.assertEqual(self.post().status_code, 503)

    @patch('web.gemini.requests.post')
    def test_blocked_or_incomplete_output_is_unavailable(self, upstream):
        response = self.provider_response()
        response.json.return_value['candidates'][0]['finishReason'] = 'MAX_TOKENS'
        upstream.return_value = response
        self.assertEqual(self.post().status_code, 503)

    @patch('web.gemini.requests.post')
    def test_no_explanation_when_trained_inference_fails(self, upstream):
        with patch('web.app.get_models', return_value={}):
            self.assertEqual(self.post().status_code, 503)
        upstream.assert_not_called()

    @patch('web.gemini.requests.post')
    def test_invalid_input_does_not_call_provider(self, upstream):
        self.assertEqual(self.post({'frequency': -1}).status_code, 400)
        upstream.assert_not_called()


if __name__ == '__main__':
    unittest.main()
