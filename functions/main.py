# Welcome to Cloud Functions for Firebase for Python!
# To get started, simply uncomment the below code or create your own.
# Deploy with `firebase deploy`

from firebase_functions import https_fn
from firebase_admin import initialize_app
import logging
import requests
import sys
import time

initialize_app()


logging.basicConfig(
    level=logging.WARNING,  # 设置日志级别为 WARNING
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)  # 将日志输出到标准输出
    ]
)


@https_fn.on_call(timeout_sec=540)
def hello_world(req: https_fn.CallableRequest) -> str:
    return "Hello, World!"


@https_fn.on_call(timeout_sec=540)
def chat(req: https_fn.CallableRequest) -> dict:
    try:
        data = req.data
        messages = data.get('messages', [])

        # Ensure message format is correct
        for msg in messages:
            if 'content' in msg and isinstance(msg['content'], list):
                for content_item in msg['content']:
                    if 'type' not in content_item:
                        content_item['type'] = 'text'
            else:
                raise ValueError("Invalid content format in messages.")

        # Call the handler function
        runpod_response = send_message_to_runpod(messages)
        return {"response": runpod_response}

    except Exception as e:
        raise https_fn.HttpsError('internal', str(e))





def send_message_to_runpod(messages: list) -> dict:
    """Starts a job on RunPod asynchronously and polls for completion."""
    endpoint_url = "https://api.runpod.ai/v2/8djrx178k38urx/run"
    api_key = "DM6XPOJPEYZMYJ6DYOKF3LO4B9ZD8AFGEDIFG9Y6"

    if not api_key:
        raise Exception("API key not found in environment variables.")

    payload = {
        "input": {
            "messages": messages
        }
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    # Start the job
    response = requests.post(
        url=endpoint_url,
        headers=headers,
        json=payload
    )

    if response.status_code != 200:
        raise Exception(f"RunPod API error: {response.status_code}, {response.text}")

    result = response.json()
    job_id = result.get('id')

    if not job_id:
        raise Exception("Failed to retrieve job ID from RunPod response.")

    # Poll for job completion
    return poll_runpod_job(job_id, api_key)




def poll_runpod_job(job_id: str, api_key: str) -> dict:
    """Polls the RunPod API for job completion."""
    status_endpoint = f"https://api.runpod.ai/v2/8djrx178k38urx/status/{job_id}"

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    retry_delay = 5  # seconds
    max_wait_time = 540  # total wait time in seconds
    total_wait_time = 0

    while total_wait_time < max_wait_time:
        logging.warning(f"total wait time: {total_wait_time}")
        response = requests.get(
            url=status_endpoint,
            headers=headers
        )

        if response.status_code != 200:
            raise Exception(f"RunPod status API error: {response.status_code}, {response.text}")

        result = response.json()
        status = result.get('status')

        if status == 'COMPLETED':
            logging.warning(f"runpod output: {result.get('output')}")
            return result.get('output')
        elif status in ['IN_PROGRESS', 'IN_QUEUE']:
            time.sleep(retry_delay)
            total_wait_time += retry_delay
        else:
            raise Exception(f"Unexpected job status: {status}")

    raise Exception("RunPod job did not complete within the expected time.")

