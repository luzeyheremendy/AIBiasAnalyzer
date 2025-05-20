document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('analysisForm');
    const results = document.getElementById('results');
    const loading = document.getElementById('loading');
    const darkModeToggle = document.getElementById('darkModeToggle');

    // Dark mode handling
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    }

    darkModeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        localStorage.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        // Actualizar gráficos si están visibles
        if (!results.classList.contains('hidden')) {
            updateCharts();
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Mostrar spinner
        loading.classList.remove('hidden');
        results.classList.add('hidden');
        
        const formData = new FormData(form);
        
        try {
            const response = await fetch('/analyze', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (data.error) {
                alert('Error al analizar las respuestas: ' + data.error);
                return;
            }
            
            // Mostrar resultados
            results.classList.remove('hidden');
            
            // Mostrar el resumen
            document.getElementById('analysisSummary').innerHTML = data.summary;
            
            // Crear gráfico de sentimiento
            createSentimentChart(data);
            
            // Crear gráfico de radar
            createRadarChart(data);
            
            // Crear nube de palabras
            createWordCloud(data);
            
            // Scroll suave hacia los resultados
            results.scrollIntoView({ behavior: 'smooth', block: 'start' });
            
        } catch (error) {
            console.error('Error:', error);
            alert('Error al procesar la solicitud');
        } finally {
            // Ocultar spinner
            loading.classList.add('hidden');
        }
    });
});

function getChartColors() {
    const isDark = document.documentElement.classList.contains('dark');
    return {
        background: isDark ? '#1f2937' : '#ffffff',
        text: isDark ? '#e5e7eb' : '#1f2937',
        blue: '#3b82f6',
        green: '#10b981',
        grid: isDark ? '#374151' : '#e5e7eb'
    };
}

function createSentimentChart(data) {
    const colors = getChartColors();
    const trace1 = {
        x: ['Sentimiento', 'Orientación Política'],
        y: [data.model1.sentiment, data.model1.political_orientation],
        name: document.querySelector('[name="model1"]').value,
        type: 'bar',
        marker: { color: colors.blue },
        text: [
            data.model1.sentiment.toFixed(2),
            data.model1.political_orientation.toFixed(2)
        ],
        textposition: 'auto',
    };

    const trace2 = {
        x: ['Sentimiento', 'Orientación Política'],
        y: [data.model2.sentiment, data.model2.political_orientation],
        name: document.querySelector('[name="model2"]').value,
        type: 'bar',
        marker: { color: colors.green },
        text: [
            data.model2.sentiment.toFixed(2),
            data.model2.political_orientation.toFixed(2)
        ],
        textposition: 'auto',
    };

    const layout = {
        barmode: 'group',
        autosize: true,
        yaxis: {
            range: [-1, 1],
            title: {
                text: 'Escala (-1 a 1)',
                font: { size: 14 }
            },
            gridcolor: colors.grid,
            color: colors.text,
            zerolinecolor: colors.grid,
            zerolinewidth: 2
        },
        xaxis: {
            color: colors.text,
            title: {
                text: 'Métricas de Análisis',
                font: { size: 14 }
            }
        },
        height: 500,
        margin: { t: 50, r: 50, l: 80, b: 120 },
        plot_bgcolor: colors.background,
        paper_bgcolor: colors.background,
        font: { color: colors.text },
        legend: { 
            font: { color: colors.text },
            orientation: 'h',
            y: -0.4,
            xanchor: 'center',
            x: 0.5
        },
        annotations: [
            {
                x: 'Sentimiento',
                y: -1.3,
                text: 'Negativo (-1) a Positivo (1)',
                showarrow: false,
                font: { color: colors.text, size: 12 }
            },
            {
                x: 'Orientación Política',
                y: -1.3,
                text: 'Izquierda (-1) a Derecha (1)',
                showarrow: false,
                font: { color: colors.text, size: 12 }
            }
        ]
    };

    const config = {
        responsive: true,
        displayModeBar: false
    };

    Plotly.newPlot('sentimentChart', [trace1, trace2], layout, config);
}

function createRadarChart(data) {
    const colors = getChartColors();
    const model1Name = document.querySelector('[name="model1"]').value;
    const model2Name = document.querySelector('[name="model2"]').value;

    const trace1 = {
        type: 'scatterpolar',
        r: [
            Math.abs(data.model1.sentiment),
            Math.abs(data.model1.political_orientation),
            data.model1.main_topics.length / 3,
            data.model1.adjectives.length / 5
        ],
        theta: [
            'Intensidad del Sentimiento',
            'Intensidad Ideológica',
            'Diversidad de Temas',
            'Riqueza de Lenguaje'
        ],
        fill: 'toself',
        name: model1Name,
        line: { color: colors.blue }
    };

    const trace2 = {
        type: 'scatterpolar',
        r: [
            Math.abs(data.model2.sentiment),
            Math.abs(data.model2.political_orientation),
            data.model2.main_topics.length / 3,
            data.model2.adjectives.length / 5
        ],
        theta: [
            'Intensidad del Sentimiento',
            'Intensidad Ideológica',
            'Diversidad de Temas',
            'Riqueza de Lenguaje'
        ],
        fill: 'toself',
        name: model2Name,
        line: { color: colors.green }
    };

    const layout = {
        autosize: true,
        polar: {
            radialaxis: {
                visible: true,
                range: [0, 1],
                color: colors.text,
                gridcolor: colors.grid,
                ticksuffix: '',
                tickfont: { size: 10 }
            },
            angularaxis: {
                color: colors.text,
                gridcolor: colors.grid
            }
        },
        showlegend: true,
        height: 400,
        margin: { t: 30, r: 80, l: 80, b: 60 },
        paper_bgcolor: colors.background,
        plot_bgcolor: colors.background,
        font: { color: colors.text },
        legend: { 
            font: { color: colors.text },
            orientation: 'h',
            y: -0.2,
            xanchor: 'center',
            x: 0.5
        }
    };

    const config = {
        responsive: true,
        displayModeBar: false
    };

    Plotly.newPlot('radarChart', [trace1, trace2], layout, config);
}

function createWordCloud(data) {
    const colors = getChartColors();
    const allAdjectives = [...data.model1.adjectives, ...data.model2.adjectives];
    
    const wordFreq = allAdjectives.reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
    }, {});

    const words = Object.entries(wordFreq).map(([text, size]) => ({
        text,
        size: size * 25 + 20,
        model: data.model1.adjectives.includes(text) ? 'model1' : 'model2'
    }));

    const width = document.getElementById('wordCloud').clientWidth;
    const height = document.getElementById('wordCloud').clientHeight;

    const layout = d3.layout.cloud()
        .size([width || 500, height || 400])
        .words(words)
        .padding(10)
        .rotate(() => 0)
        .fontSize(d => d.size)
        .spiral("archimedean")
        .on("end", draw);

    layout.start();

    function draw(words) {
        d3.select("#wordCloud").select("svg").remove();

        const svg = d3.select("#wordCloud")
            .append("svg")
            .attr("width", '100%')
            .attr("height", '100%')
            .attr("preserveAspectRatio", "xMidYMid meet")
            .attr("viewBox", `0 0 ${width || 500} ${height || 400}`)
            .style("background-color", colors.background)
            .append("g")
            .attr("transform", `translate(${(width || 500) / 2},${(height || 400) / 2})`);

        // Agregar un rectángulo de fondo
        svg.append("rect")
            .attr("x", -(width || 500) / 2)
            .attr("y", -(height || 400) / 2)
            .attr("width", width || 500)
            .attr("height", height || 400)
            .attr("fill", colors.background);

        svg.selectAll("text")
            .data(words)
            .enter().append("text")
            .style("font-size", d => `${d.size}px`)
            .style("font-family", "Arial")
            .style("font-weight", "bold")
            .style("fill", d => d.model === 'model1' ? colors.blue : colors.green)
            .attr("text-anchor", "middle")
            .attr("transform", d => `translate(${d.x},${d.y})`)
            .text(d => d.text)
            .append("title")  // Tooltip
            .text(d => `${d.text} (${d.model === 'model1' ? document.querySelector('[name="model1"]').value : document.querySelector('[name="model2"]').value})`);
    }
}

// Función para actualizar los gráficos cuando cambia el modo
function updateCharts() {
    const sentimentChart = document.getElementById('sentimentChart');
    const radarChart = document.getElementById('radarChart');
    const wordCloud = document.getElementById('wordCloud');
    
    if (sentimentChart && sentimentChart.data) {
        createSentimentChart({
            model1: sentimentChart.data[0],
            model2: sentimentChart.data[1]
        });
    }
    
    if (radarChart && radarChart.data) {
        createRadarChart({
            model1: radarChart.data[0],
            model2: radarChart.data[1]
        });
    }
    
    if (wordCloud) {
        // Re-crear nube de palabras con nuevos colores
        createWordCloud({
            model1: { adjectives: [] },
            model2: { adjectives: [] }
        });
    }
} 