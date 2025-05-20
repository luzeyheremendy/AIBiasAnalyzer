# Análisis de Sesgo en LLMs

Esta aplicación web permite comparar y analizar el sesgo político en las respuestas de diferentes modelos de lenguaje (LLMs) en el contexto de la política argentina.

## Características
- Análisis de sentimiento de respuestas
- Visualizaciones comparativas (gráfico de sentimiento, radar y nube de palabras)
- Soporte para múltiples LLMs (ChatGPT, Grok, Deepseek)
- Interfaz intuitiva para ingresar preguntas y respuestas

## Requisitos
- Python 3.8+
- Node.js (para instalar Tailwind)

## Instalación

1. Clonar el repositorio:
```bash
git clone [url-del-repositorio]
cd llm_bias
```

2. Instalar dependencias de Python:
```bash
pip install -r requirements.txt
```

3. Configurar variables de entorno:
```bash
cp .env.example .env
# Editar .env con tu API key de Google (Gemini)
```

4. Iniciar el servidor:
```bash
python app.py
```

5. Abrir `http://localhost:8000` en tu navegador

## Estructura del Proyecto
```
.
├── static/          # Archivos estáticos (CSS, JS)
├── templates/       # Plantillas HTML
├── app.py          # Servidor FastAPI
└── requirements.txt # Dependencias de Python
``` # AIBiasAnalyzer
# AIBiasAnalyzer
