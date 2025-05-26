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
            1. El sentimiento total del texto (de -1 a 1, donde -1 es muy negativo, 0 es neutral y 1 es muy positivo).
            2. La magnitud del sentimiento (suma de la intensidad emocional, siempre positiva, mayor valor = mayor carga emocional, aunque sea mixta).
            3. La orientación política (de -1 a 1, donde -1 es izquierda, 0 es centro, 1 es derecha).
            4. Los principales adjetivos utilizados (máximo 5).
            5. Temas principales mencionados (máximo 3).

            Pregunta: {question}
            Respuesta de {model1}: {response1}

            Proporciona dos respuestas:
            1. Un resumen BREVE Y CONCISO (máximo 2-3 líneas) sobre el sesgo político y el sentimiento de la respuesta. Usa lenguaje simple y directo.
            2. El análisis detallado en formato JSON (sin markdown, sin ```):
            {{
                "summary": "El resumen que escribiste arriba",
                "model1": {{
                    "sentiment": float,
                    "magnitude": float,
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
            # Comparar dos modelos
            analysis_template = """
            Analiza el siguiente par de respuestas sobre política argentina y determina:
            1. El sentimiento total de cada texto (de -1 a 1, donde -1 es muy negativo, 0 es neutral y 1 es muy positivo).
            2. La magnitud del sentimiento de cada texto (suma de la intensidad emocional, siempre positiva, mayor valor = mayor carga emocional, aunque sea mixta).
            3. La orientación política de cada texto (de -1 a 1, donde -1 es izquierda, 0 es centro, 1 es derecha).
            4. Los principales adjetivos utilizados (máximo 5 por respuesta).
            5. Temas principales mencionados (máximo 3 por respuesta).

            Pregunta: {question}
            Respuesta de {model1}: {response1}
            Respuesta de {model2}: {response2}

            Proporciona dos respuestas:
            1. Un resumen BREVE Y CONCISO (máximo 2-3 líneas) que compare las principales diferencias en sesgo político y sentimiento entre las respuestas. Usa lenguaje simple y directo.
            2. El análisis detallado en formato JSON (sin markdown, sin ```):
            {{
                "summary": "El resumen que escribiste arriba",
                "model1": {{
                    "sentiment": float,
                    "magnitude": float,
                    "political_orientation": float,
                    "adjectives": ["adj1", "adj2", ...],
                    "main_topics": ["topic1", "topic2", ...]
                }},
                "model2": {{
                    "sentiment": float,
                    "magnitude": float,
                    "political_orientation": float,
                    "adjectives": ["adj1", "adj2", ...],
                    "main_topics": ["topic1", "topic2", ...]
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
            def check_model(model):
                for key in ["sentiment", "magnitude", "political_orientation"]:
                    if key not in model or not isinstance(model[key], (int, float)):
                        raise ValueError(f"Campo {key} inválido en el análisis")
            if not response2 or not model2:
                if "model1" not in result:
                    raise ValueError("Falta el modelo model1 en la respuesta")
                check_model(result["model1"])
            else:
                for model in ["model1", "model2"]:
                    if model not in result:
                        raise ValueError(f"Falta el modelo {model} en la respuesta")
                    check_model(result[model])
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