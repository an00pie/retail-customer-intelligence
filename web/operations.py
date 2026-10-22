"""Phase-one operational workflows. All mutations are authenticated and audited."""
import json
import math
import random
from contextlib import closing
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request, render_template, current_app
from web.db import get_db_connection

operations = Blueprint('operations', __name__, url_prefix='/api/v1/operations')


def init_operations(conn):
    conn.executescript('''
        CREATE TABLE IF NOT EXISTS operational_items (
            id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, kind TEXT NOT NULL,
            payload TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS campaign_members (
            campaign_id INTEGER NOT NULL, customer_id TEXT NOT NULL, arm TEXT NOT NULL,
            segment TEXT, contacted INTEGER DEFAULT 0, converted INTEGER DEFAULT 0,
            retained INTEGER, revenue REAL DEFAULT 0, cost REAL DEFAULT 0, outcome_recorded INTEGER DEFAULT 0,
            PRIMARY KEY(campaign_id, customer_id)
        );
    ''')
    if 'outcome_recorded' not in {r[1] for r in conn.execute('PRAGMA table_info(campaign_members)')}:
        conn.execute('ALTER TABLE campaign_members ADD COLUMN outcome_recorded INTEGER DEFAULT 0')


def now():
    return datetime.now(timezone.utc).isoformat()


def audit(conn, user, action, item_id, payload):
    conn.execute('INSERT INTO audit_logs(action,entity_type,entity_id,user_id,details_json,timestamp) VALUES(?,?,?,?,?,?)',
                 (action, 'operations', str(item_id), user['id'], json.dumps(payload), now()))


def quality_report():
    with closing(get_db_connection()) as conn, conn:
        row = dict(conn.execute('''SELECT COUNT(*) records, MAX(meta_last_updated) refreshed_at,
            MIN(meta_last_updated) oldest_record_at,
            SUM(CASE WHEN recency_days IS NULL OR frequency IS NULL OR monetary IS NULL
                OR recency_days < 0 OR frequency < 1 OR monetary < 0 THEN 1 ELSE 0 END) invalid_records,
            SUM(CASE WHEN meta_last_updated IS NULL OR meta_last_updated = '' THEN 1 ELSE 0 END) missing_timestamps,
            SUM(CASE WHEN pred_clv IS NOT NULL AND pred_churn_probability BETWEEN 0 AND 1 THEN 1 ELSE 0 END) prediction_coverage
            FROM customer_profile''').fetchone())
        latest = conn.execute('SELECT * FROM dataset_imports ORDER BY id DESC LIMIT 1').fetchone()
        previous = conn.execute('SELECT * FROM dataset_imports ORDER BY id DESC LIMIT 1 OFFSET 1').fetchone()
    alerts = []
    for field in ('invalid_records', 'missing_timestamps'):
        row[field] = row[field] or 0
        if row[field]:
            alerts.append(f"{row[field]} {field.replace('_', ' ')}")
    if not row['records']:
        alerts.append('Serving dataset is empty')
    try:
        age = (datetime.now(timezone.utc) - datetime.fromisoformat(row['oldest_record_at']).astimezone(timezone.utc)).total_seconds() / 86400
        if age > 7:
            alerts.append('Some serving records are older than the 7-day freshness threshold')
    except (ValueError, TypeError):
        alerts.append('Record freshness cannot be verified')
    if latest and latest['rejected_rows']:
        alerts.append(f"Latest import rejected {latest['rejected_rows']} rows")
    if latest and previous and previous['total_rows'] and abs(latest['total_rows'] / previous['total_rows'] - 1) > .5:
        alerts.append('Import volume changed by more than 50%; review source scope')
    return {**row, 'source': 'customer_profile serving snapshot', 'freshness_threshold_days': 7,
            'timestamp_meaning': 'Serving refresh, not source transaction date',
            'ingestion': dict(latest) if latest else None,
            'volume_anomaly_status': 'No comparable import baseline' if not previous else 'Previous import compared using a 50% change threshold; source scopes may differ',
            'alerts': alerts, 'checked_at': now()}


@operations.get('/quality')
def quality():
    return jsonify(quality_report())


@operations.get('/workspace')
def workspace():
    return render_template('operations.html')


@operations.post('/explain-prediction')
def explain_prediction():
    from web.api_v1 import get_current_user
    from web.app import api_predict
    from web.gemini import explain_prediction as generate, ExplanationUnavailable
    if not get_current_user():
        return jsonify(error='Sign in to request an AI explanation'), 401
    # Recompute on the server; never send client-provided predictions or customer records.
    response = current_app.make_response(api_predict())
    if response.status_code != 200:
        return response
    try:
        result = generate(response.get_json())
    except ExplanationUnavailable as error:
        return jsonify(error=str(error), inference_status='explanation_unavailable'), 503
    return jsonify(result)


@operations.route('/items', methods=['GET', 'POST'])
@operations.route('/items/<int:item_id>', methods=['PATCH'])
def items(item_id=None):
    from web.api_v1 import get_current_user
    user = get_current_user()
    if not user:
        return jsonify(error='Sign in to manage operational work'), 401
    with closing(get_db_connection()) as conn, conn:
        if request.method == 'GET':
            rows = conn.execute('SELECT * FROM operational_items WHERE user_id=? ORDER BY id DESC', (user['id'],)).fetchall()
            return jsonify(items=[{**dict(r), 'payload': json.loads(r['payload'])} for r in rows])
        data = request.get_json(silent=True)
        if not isinstance(data, dict):
            return jsonify(error='JSON object required'), 400
        if request.method == 'PATCH':
            row = conn.execute('SELECT * FROM operational_items WHERE id=? AND user_id=?', (item_id, user['id'])).fetchone()
            if not row:
                return jsonify(error='Item not found'), 404
            kind = row['kind']
            if set(data) - {'name', 'owner', 'notes', 'follow_up', 'status'}:
                return jsonify(error='Cohort snapshots are immutable; update owner, notes, date, name or status'), 400
            payload = {**json.loads(row['payload']), **data}
            if kind != 'action':
                return jsonify(error='Only action work items can be edited'), 400
        else:
            kind = data.get('kind')
            payload = data.get('payload')
        if kind not in ('action', 'campaign', 'filter') or not isinstance(payload, dict):
            return jsonify(error='Valid kind and payload required'), 400
        if not isinstance(payload.get('name'), str) or not 1 <= len(payload['name'].strip()) <= 160:
            return jsonify(error='Name must be 1–160 characters'), 400
        if len(json.dumps(payload)) > 20000:
            return jsonify(error='Payload too large'), 400
        for field in ('owner', 'notes', 'segment', 'intervention', 'outcome_definition', 'status'):
            if field in payload and not isinstance(payload[field], str):
                return jsonify(error=f'{field} must be text'), 400
        if payload.get('follow_up'):
            try:
                datetime.strptime(payload['follow_up'], '%Y-%m-%d')
            except (ValueError, TypeError):
                return jsonify(error='Follow-up must be YYYY-MM-DD'), 400
        if kind == 'action' and payload.get('status', 'open') not in ('open', 'in_progress', 'done'):
            return jsonify(error='Invalid work status'), 400
        members = []
        if kind == 'action' and (not payload.get('owner') or not payload.get('segment')):
            return jsonify(error='Owner and cohort are required'), 400
        if kind == 'action' and request.method == 'POST' and payload.get('segment'):
            payload['customer_ids'] = [r[0] for r in conn.execute('SELECT row_key FROM customer_profile WHERE info_segment=? ORDER BY row_key', (payload['segment'],))]
            if not payload['customer_ids']:
                return jsonify(error='No customers match this cohort'), 400
        if kind == 'campaign':
            if not payload.get('intervention') or not payload.get('outcome_definition'):
                return jsonify(error='Intervention and outcome definition required'), 400
            segment = payload.get('segment', '')
            members = conn.execute('SELECT row_key, info_segment FROM customer_profile WHERE info_segment=? ORDER BY row_key', (segment,)).fetchall()
            if len(members) < 2:
                return jsonify(error='Select a cohort with at least two customers'), 400
            random.SystemRandom().shuffle(members)
        stamp = now()
        if item_id:
            conn.execute('UPDATE operational_items SET payload=?,updated_at=? WHERE id=?', (json.dumps(payload), stamp, item_id))
        else:
            item_id = conn.execute('INSERT INTO operational_items(user_id,kind,payload,created_at,updated_at) VALUES(?,?,?,?,?)',
                                   (user['id'], kind, json.dumps(payload), stamp, stamp)).lastrowid
        for index, member in enumerate(members):
            conn.execute('INSERT INTO campaign_members(campaign_id,customer_id,arm,segment) VALUES(?,?,?,?)',
                         (item_id, member['row_key'], 'control' if index < max(1, len(members)//5) else 'treatment', member['info_segment']))
        audit(conn, user, 'item_updated' if request.method == 'PATCH' else 'item_created', item_id, payload)
    return jsonify(id=item_id), 200 if request.method == 'PATCH' else 201


@operations.route('/campaigns/<int:campaign_id>', methods=['GET', 'POST'])
def campaign(campaign_id):
    from web.api_v1 import get_current_user
    user = get_current_user()
    if not user:
        return jsonify(error='Sign in required'), 401
    with closing(get_db_connection()) as conn, conn:
        item = conn.execute("SELECT * FROM operational_items WHERE id=? AND user_id=? AND kind='campaign'", (campaign_id, user['id'])).fetchone()
        if not item:
            return jsonify(error='Campaign not found'), 404
        if request.method == 'POST':
            data = request.get_json(silent=True) or {}
            if not isinstance(data, dict):
                return jsonify(error='JSON object required'), 400
            try:
                revenue, cost = float(data.get('revenue', 0)), float(data.get('cost', 0))
                if not all(math.isfinite(n) and n >= 0 for n in (revenue, cost)):
                    raise ValueError()
                if any(data.get(k, 0) not in (0, 1) for k in ('contacted', 'converted')) or data.get('retained') not in (None, 0, 1):
                    raise ValueError()
            except (TypeError, ValueError):
                return jsonify(error='Invalid outcome values'), 400
            member = conn.execute('SELECT * FROM campaign_members WHERE campaign_id=? AND customer_id=?', (campaign_id, str(data.get('customer_id', '')))).fetchone()
            if not member:
                return jsonify(error='Customer is not a campaign member'), 404
            if member['arm'] == 'control' and data.get('contacted'):
                return jsonify(error='Control group must remain uncontacted'), 400
            conn.execute('UPDATE campaign_members SET contacted=?,converted=?,retained=?,revenue=?,cost=?,outcome_recorded=1 WHERE campaign_id=? AND customer_id=?',
                         (data.get('contacted', 0), data.get('converted', 0), data.get('retained'), revenue, cost, campaign_id, member['customer_id']))
            audit(conn, user, 'campaign_outcome_recorded', campaign_id, data)
        arms = [dict(r) for r in conn.execute('''SELECT arm, COUNT(*) members, SUM(contacted) contacted,
            SUM(outcome_recorded) observed, SUM(CASE WHEN outcome_recorded=1 THEN converted ELSE 0 END) conversions,
            AVG(CASE WHEN outcome_recorded=1 THEN converted END) conversion_rate,
            COUNT(retained) retention_observed, AVG(retained) retention_rate,
            SUM(revenue) revenue, SUM(cost) cost FROM campaign_members WHERE campaign_id=? GROUP BY arm''', (campaign_id,))]
        by_arm = {r['arm']: r for r in arms}
        treatment, control = by_arm['treatment'], by_arm['control']
        enough = min(treatment['observed'], control['observed']) >= 30 and all(r['observed'] == r['members'] for r in arms)
        incremental = treatment['revenue'] - control['revenue'] / control['members'] * treatment['members']
        history = [dict(r) for r in conn.execute("SELECT action,details_json,timestamp FROM audit_logs WHERE entity_type='operations' AND entity_id=? AND user_id=? ORDER BY id", (str(campaign_id), user['id']))]
        return jsonify(arms=arms, incremental_revenue=incremental if enough else None,
                       measurement_status='Descriptive only; manual attribution review required' if enough else 'Insufficient sample: at least 30 per arm required',
                       attribution=json.loads(item['payload'])['outcome_definition'], audit=history,
                       members=[dict(r) for r in conn.execute('SELECT * FROM campaign_members WHERE campaign_id=?', (campaign_id,))])


@operations.get('/items/<int:item_id>/audit')
def item_audit(item_id):
    from web.api_v1 import get_current_user
    user = get_current_user()
    if not user:
        return jsonify(error='Sign in required'), 401
    with closing(get_db_connection()) as conn, conn:
        rows = conn.execute("SELECT action,details_json,timestamp FROM audit_logs WHERE entity_type='operations' AND entity_id=? AND user_id=? ORDER BY id", (str(item_id), user['id']))
        return jsonify(events=[dict(r) for r in rows])
