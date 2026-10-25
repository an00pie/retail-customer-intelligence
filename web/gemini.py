"""Server-only, evidence-grounded Gemini explanations of existing ML results."""
import json
import os
import re
import requests


class ExplanationUnavailable(Exception):
    pass


def explain_prediction(prediction):
    key = os.environ.get('GEMINI_API_KEY', '').strip()
    if not key:
        raise ExplanationUnavailable('Gemini is not configured on the backend.')
    model = os.environ.get('GEMINI_MODEL', 'gemini-flash-lite-latest').strip()
    if not re.fullmatch(r'gemini-[a-zA-Z0-9.\-]+', model):
        raise ExplanationUnavailable('The backend Gemini model configuration is invalid.')
    evidence = {
        'prediction': {name: prediction[name] for name in ('segment', 'predicted_clv', 'churn_probability')},
        'feature_inputs': prediction['feature_inputs'],
        'global_importances': prediction['drivers'],
        'provenance': {name: prediction.get(name) for name in ('model_versions', 'trained_data_timestamp', 'trained_data_timestamp_status')},
    }
    payload = {
        'systemInstruction': {'parts': [{'text': (
            'Explain the provided computed retail prediction in concise plain language. '
            'Treat the supplied JSON as the only evidence. Never invent values, confidence, '
            'causal claims, local feature contributions, expected campaign returns, or actions already taken. '
            'Global importances are not directional or individual explanations. A missing timestamp is unknown. '
            'Do not infer customer identity. Do not replace the trained predictions. '
            'Return summary and evidence_refs; references must be selected from prediction, feature_inputs, '
            'global_importances, provenance. Explain uncertainty and limitations.'
        )}]},
        'contents': [{'role': 'user', 'parts': [{'text': json.dumps(evidence, allow_nan=False)}]}],
        'generationConfig': {
            'temperature': 0.1, 'maxOutputTokens': 1400, 'responseMimeType': 'application/json',
            'responseSchema': {'type': 'OBJECT', 'properties': {
                'summary': {'type': 'STRING'},
                'evidence_refs': {'type': 'ARRAY', 'items': {'type': 'STRING'}},
            }, 'required': ['summary', 'evidence_refs']},
        },
    }
    try:
        response = requests.post(
            f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
            headers={'x-goog-api-key': key, 'Content-Type': 'application/json'},
            json=payload, timeout=(5, 30),
        )
        response.raise_for_status()
        candidate = response.json()['candidates'][0]
        if candidate.get('finishReason') != 'STOP':
            raise ValueError('Incomplete or blocked explanation')
        text = ''.join(part.get('text', '') for part in candidate['content']['parts'] if not part.get('thought'))
        result = json.loads(text)
        summary, refs = result['summary'], result['evidence_refs']
        if not isinstance(summary, str) or not 1 <= len(summary.strip()) <= 6000:
            raise ValueError('Invalid summary')
        if not isinstance(refs, list) or not refs or not all(isinstance(ref, str) and ref in evidence for ref in refs):
            raise ValueError('Invalid evidence references')
    except (requests.RequestException, ValueError, KeyError, IndexError, TypeError, AttributeError):
        # Never include provider responses, request headers, or credentials in errors/logs.
        raise ExplanationUnavailable('Gemini explanation is unavailable. The computed prediction remains available.') from None
    return {
        'provider': 'Gemini', 'model': model, 'summary': summary,
        'evidence_refs': list(dict.fromkeys(refs)), 'evidence': evidence,
        'notice': 'AI-generated explanation; verify against the linked evidence. Global importance is not individual or causal attribution.',
    }
