import os
import time
import random
import requests
import openai
from openai import OpenAI
from openai.types.chat import ChatCompletionMessageParam
from dotenv import load_dotenv

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")
PERPLEXITY_ENDPOINT = "https://api.perplexity.ai/chat/completions"  # Fixed endpoint
openai.api_key = OPENAI_API_KEY
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

PROMPT_TEMPLATE = """
You are a real estate analyst. A user asked: {question}

We have the following data:
{data}

Please analyze and provide recommendations.
"""

def generate_fallback_analysis(data: str, error_reason: str = "API unavailable") -> str:
    """Generate fallback analysis when APIs are unavailable"""
    fallback = f"LLM analysis unavailable - {error_reason}.\n\n"
    
    if "years_since_last_bto" in data or "Years since BTO" in data:
        fallback += """
Based on historical BTO launch patterns, the recommended towns show significant potential:

• Towns with 10+ years since last BTO launch indicate underserved areas with potential pent-up demand
• These locations may be prime candidates for new BTO developments due to market gaps
• Consider proximity to MRT lines, schools, and commercial developments
• Long gaps between launches often correlate with infrastructure improvements and area maturation

Investment considerations:
- Established neighborhoods with proven demand
- Higher years since last BTO may indicate upcoming development
- Potential capital appreciation once new BTOs launch
"""
    else:
        fallback += "Recommendations align with current market trends and historical patterns."

    return fallback

def analyze_with_perplexity(question: str, data: str) -> str:
    """Analyze using Perplexity API"""
    if not PERPLEXITY_API_KEY:
        print("❌ Perplexity API key not configured")
        raise Exception("Perplexity API key not configured")
        
    headers = {
        "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "sonar-pro",
        "messages": [
            {"role": "system", "content": "You are an expert real estate analyst specializing in Singapore HDB properties."},
            {"role": "user", "content": f"User asked: {question}\n\nData:\n{data}\n\nGive analysis."}
        ],
        "temperature": 0.7,
        "max_tokens": 1000
    }

    try:
        print("🔄 Calling Perplexity API...")
        print(f"📍 Endpoint: {PERPLEXITY_ENDPOINT}")
        print(f"🤖 Model: {payload['model']}")
        print(f"📝 Question: {question[:100]}...")
        print(f"📊 Data length: {len(data)} characters")
        
        # Increased timeout to 60 seconds
        response = requests.post(PERPLEXITY_ENDPOINT, headers=headers, json=payload, timeout=60)
        
        print(f"📡 Response status: {response.status_code}")
        print(f"⏱️ Response time: {response.elapsed.total_seconds():.2f}s")
        
        if response.status_code != 200:
            print(f"❌ Perplexity error response: {response.text}")
            raise Exception(f"Perplexity API returned status {response.status_code}: {response.text}")
            
        response.raise_for_status()
        result = response.json()
        
        print("✅ Perplexity API call successful!")
        print(f"📋 Full response structure: {list(result.keys())}")
        
        if 'choices' not in result or not result['choices']:
            print(f"❌ Invalid response format - missing choices: {result}")
            raise Exception(f"Invalid Perplexity response format: {result}")
        
        content = result['choices'][0]['message']['content'].strip()
        print(f"📄 Response length: {len(content)} characters")
        print("🎯 PERPLEXITY ANALYSIS OUTPUT:")
        print("=" * 50)
        print(content)
        print("=" * 50)
        
        return content
        
    except requests.exceptions.Timeout as e:
        print(f"⏰ Perplexity API timeout after 60 seconds: {e}")
        raise Exception(f"Perplexity API timeout: {e}")
    except requests.exceptions.RequestException as e:
        print(f"🌐 Perplexity network error: {e}")
        raise Exception(f"Perplexity API call failed: {e}")
    except KeyError as e:
        print(f"🔑 Perplexity response parsing error: {e}")
        print(f"Raw response: {result if 'result' in locals() else 'No response received'}")
        raise Exception(f"Unexpected Perplexity response format: {e}")
    except Exception as e:
        print(f"💥 Perplexity general error: {e}")
        raise Exception(f"Perplexity API error: {e}")

def analyze_with_llm(question: str, data: str) -> str:
    """Main LLM analysis function with 3-tier fallback"""
    prompt = PROMPT_TEMPLATE.format(question=question, data=data)

    max_retries = 1  
    base_delay = 1

    for attempt in range(max_retries):
        try:
            if attempt > 0:
                delay = base_delay * (2 ** attempt) + random.uniform(0, 1)
                print(f"[Retry {attempt}] Sleeping {round(delay, 2)}s due to rate limit...")
                time.sleep(delay)

            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are an expert real estate analyst specializing in Singapore HDB properties."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            return response.choices[0].message.content.strip()

        except Exception as e:
            print(f"OpenAI attempt {attempt + 1} failed: {e}")
            if attempt == max_retries - 1:
                print("OpenAI failed after 3 attempts, trying Perplexity...")
                break

    # Try Perplexity as fallback
    try:
        print("Attempting Perplexity fallback...")
        return analyze_with_perplexity(question, data)
    except Exception as perp_error:
        print(f"Perplexity also failed: {perp_error}")
        print("Both APIs failed, using fallback analysis...")
        return generate_fallback_analysis(data, "Both OpenAI and Perplexity APIs unavailable")
