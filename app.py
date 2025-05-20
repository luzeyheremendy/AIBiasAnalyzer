from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import google.generativeai as genai
from dotenv import load_dotenv
from langchain_google_genai import GoogleGenerativeAI
from langchain.prompts import PromptTemplate
import os
import json

# Cargar variables de entorno
load_dotenv()

# Configurar Gemini
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    raise ValueError("No se encontró GOOGLE_API_KEY en las variables de entorno")

genai.configure(api_key=api_key)

app = FastAPI(
    title="AI Bias Analyzer",
    description="Analizador de sesgo político en respuestas de modelos de IA",
    version="1.0.0"
)

# Montar archivos estáticos
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/analyze")
async def analyze_responses(
    question: str = Form(...),
    response1: str = Form(...),
    response2: str = Form(None),
    model1: str = Form(...),
    model2: str = Form(None)
):
    try:
        llm = GoogleGenerativeAI(model='gemini-2.0-flash-001', google_api_key=api_key)
        if not response2 or not model2:
            # Solo un modelo
            analysis_template = """
            Analiza la siguiente respuesta sobre política argentina y determina:
            1. El sentimiento general (positivo/negativo/neutral) en una escala de -1 a 1
            2. La orientación política (izquierda/centro/derecha) en una escala de -1 (izquierda) a 1 (derecha)
            3. Los principales adjetivos utilizados (máximo 5)
            4. Temas principales mencionados (máximo 3)

            Pregunta: {question}
            Respuesta de {model1}: {response1}

            Proporciona dos respuestas:
            1. Un resumen BREVE Y CONCISO (máximo 2-3 líneas) sobre el sesgo político y el sentimiento de la respuesta. Usa lenguaje simple y directo.
            2. El análisis detallado en formato JSON (sin markdown, sin ```):
            {{
                "summary": "El resumen que escribiste arriba",
                "model1": {{
                    "sentiment": float,
                    "political_orientation": float,
                    "adjectives": ["adj1", "adj2", ...],
                    "main_topics": ["topic1", "topic2", ...]
                }}
            }}
            """
            prompt = PromptTemplate(
                template=analysis_template,
                input_variables=["question", "model1", "response1"]
            )
            analysis = llm.invoke(
                prompt.format(
                    question=question,
                    model1=model1,
                    response1=response1
                )
            )
        else:
            # Comparar dos modelos (código existente)
            analysis_template = """
            Analiza el siguiente par de respuestas sobre política argentina y determina:
            1. El sentimiento general (positivo/negativo/neutral) en una escala de -1 a 1
               - Usa valores entre -1 (muy negativo) y 1 (muy positivo)
               - 0 solo debe usarse cuando el texto es completamente neutral
               - Evita usar 0 por defecto, intenta detectar aunque sea ligeras tendencias

            2. La orientación política (izquierda/centro/derecha) en una escala de -1 (izquierda) a 1 (derecha)
               - Usa valores entre -1 (extrema izquierda) y 1 (extrema derecha)
               - 0 solo debe usarse cuando la posición es genuinamente de centro
               - Evita usar 0 por defecto, intenta detectar aunque sea ligeras tendencias
               - Considera el contexto argentino al evaluar la orientación

            3. Los principales adjetivos utilizados (máximo 5)
               - Incluye adjetivos que reflejen la postura política o el tono emocional
               - Si no hay suficientes adjetivos explícitos, infiere algunos basados en el tono y contenido

            4. Temas principales mencionados (máximo 3)
               - Identifica los temas políticos, económicos o sociales más relevantes
               - Usa etiquetas concisas pero descriptivas

            Pregunta: {question}
            
            Respuesta de {model1}: {response1}
            
            Respuesta de {model2}: {response2}
            
            Proporciona dos respuestas:

            1. Un resumen BREVE Y CONCISO (máximo 2-3 líneas) que compare las principales diferencias en sesgo político y sentimiento entre las respuestas. Usa lenguaje simple y directo.

            2. El análisis detallado en formato JSON (sin markdown, sin ```):
            {{
                "summary": "El resumen que escribiste arriba",
                "model1": {{
                    "sentiment": float,  # Evita usar 0 por defecto, usa valores entre -1 y 1
                    "political_orientation": float,  # Evita usar 0 por defecto, usa valores entre -1 y 1
                    "adjectives": ["adj1", "adj2", ...],  # Al menos 2 adjetivos
                    "main_topics": ["topic1", "topic2", ...]  # Al menos 1 tema
                }},
                "model2": {{
                    "sentiment": float,  # Evita usar 0 por defecto, usa valores entre -1 y 1
                    "political_orientation": float,  # Evita usar 0 por defecto, usa valores entre -1 y 1
                    "adjectives": ["adj1", "adj2", ...],  # Al menos 2 adjetivos
                    "main_topics": ["topic1", "topic2", ...]  # Al menos 1 tema
                }}
            }}
            """
            prompt = PromptTemplate(
                template=analysis_template,
                input_variables=["question", "model1", "response1", "model2", "response2"]
            )
            analysis = llm.invoke(
                prompt.format(
                    question=question,
                    model1=model1,
                    response1=response1,
                    model2=model2,
                    response2=response2
                )
            )
        try:
            cleaned_analysis = analysis
            if "```json" in analysis:
                cleaned_analysis = analysis.split("```json")[1]
            elif "```" in analysis:
                cleaned_analysis = analysis.split("```")[1]
            cleaned_analysis = cleaned_analysis.strip()
            if cleaned_analysis.endswith("```"):
                cleaned_analysis = cleaned_analysis[:-3].strip()
            result = json.loads(cleaned_analysis)
            # Verificar la estructura del JSON
            if not response2 or not model2:
                if "model1" not in result:
                    raise ValueError("Falta el modelo model1 en la respuesta")
                if not isinstance(result["model1"]["sentiment"], (int, float)):
                    raise ValueError("Sentimiento inválido para model1")
                if not isinstance(result["model1"]["political_orientation"], (int, float)):
                    raise ValueError("Orientación política inválida para model1")
            else:
                for model in ["model1", "model2"]:
                    if model not in result:
                        raise ValueError(f"Falta el modelo {model} en la respuesta")
                    if not isinstance(result[model]["sentiment"], (int, float)):
                        raise ValueError(f"Sentimiento inválido para {model}")
                    if not isinstance(result[model]["political_orientation"], (int, float)):
                        raise ValueError(f"Orientación política inválida para {model}")
            return result
        except json.JSONDecodeError as e:
            print(f"Error al decodificar JSON: {e}")
            print(f"Respuesta recibida: {analysis}")
            raise HTTPException(status_code=500, detail="Error al procesar la respuesta del modelo")
        except ValueError as e:
            print(f"Error en la estructura del JSON: {e}")
            print(f"Respuesta recibida: {analysis}")
            raise HTTPException(status_code=500, detail="Formato de respuesta inválido del modelo")
    except Exception as e:
        print(f"Error inesperado: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al procesar el análisis: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port) 