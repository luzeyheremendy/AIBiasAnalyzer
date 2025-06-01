document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('analysisForm');
    const results = document.getElementById('results');
    const loading = document.getElementById('loading');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const modeSelect = document.getElementById('mode');
    const model2Container = document.getElementById('model2Container');

    // Dark mode handling
    if (localStorage.getItem('darkMode') === 'true' || 
        (!localStorage.getItem('darkMode') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    }

    darkModeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('darkMode', document.documentElement.classList.contains('dark'));
        // Actualizar gráficos si están visibles
        if (!results.classList.contains('hidden')) {
            updateCharts();
        }
    });

    // Mostrar/ocultar inputs según modo
    modeSelect.addEventListener('change', () => {
        if (modeSelect.value === 'single') {
            model2Container.style.display = 'none';
            // Estirar el input de respuesta
            document.getElementById('modelsContainer').classList.remove('md:grid-cols-2');
            document.getElementById('modelsContainer').classList.add('md:grid-cols-1');
            document.getElementById('model1Container').classList.add('col-span-2');
        } else {
            model2Container.style.display = 'block';
            document.getElementById('modelsContainer').classList.remove('md:grid-cols-1');
            document.getElementById('modelsContainer').classList.add('md:grid-cols-2');
            document.getElementById('model1Container').classList.remove('col-span-2');
        }
    });
    // Trigger al cargar
    modeSelect.dispatchEvent(new Event('change'));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        loading.classList.remove('hidden');
        results.classList.add('hidden');
        
        const formData = new FormData(form);
        // Si es modo single, borra los campos del segundo modelo
        if (modeSelect.value === 'single') {
            formData.delete('response2');
            formData.delete('model2');
        }
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
            results.classList.remove('hidden');
            document.getElementById('analysisSummary').innerHTML = data.summary;
            if (modeSelect.value === 'single') {
                createSentimentChartSingle(data);
                createPoliticalChartSingle(data);
                createRadarChartSingle(data);
                createWordCloudSingle(data);
            } else {
                createSentimentChart(data);
                createPoliticalChart(data);
                createRadarChart(data);
                createWordCloud(data);
            }
            results.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) {
            console.error('Error:', error);
            alert('Error al procesar la solicitud');
        } finally {
            loading.classList.add('hidden');
        }
    });

    setGraphTooltips();
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
    const model1Name = document.querySelector('[name="model1"]').value;
    const model2Name = document.querySelector('[name="model2"]').value;

    const xLabels = ['Sentimiento Total', 'Magnitud'];
    const trace1 = {
        x: xLabels,
        y: [data.model1.sentiment, data.model1.magnitude],
        name: model1Name,
        type: 'bar',
        marker: { color: colors.blue },
        text: [
            data.model1.sentiment.toFixed(2),
            data.model1.magnitude.toFixed(2)
        ],
        textposition: 'auto',
        hovertemplate: '%{x}: %{y:.2f}<extra>' + model1Name + '</extra>'
    };
    const trace2 = {
        x: xLabels,
        y: [data.model2.sentiment, data.model2.magnitude],
        name: model2Name,
        type: 'bar',
        marker: { color: colors.green },
        text: [
            data.model2.sentiment.toFixed(2),
            data.model2.magnitude.toFixed(2)
        ],
        textposition: 'auto',
        hovertemplate: '%{x}: %{y:.2f}<extra>' + model2Name + '</extra>'
    };
    const layout = {
        barmode: 'group',
        autosize: true,
        yaxis: {
            title: {
                text: 'Valor',
                font: { size: 14 }
            },
            gridcolor: colors.grid,
            color: colors.text,
            zerolinecolor: colors.grid,
            zerolinewidth: 2,
            rangemode: 'tozero',
            automargin: true
        },
        xaxis: {
            color: colors.text,
            title: {
                text: '',
                font: { size: 14 }
            },
            tickfont: { size: 15 }
        },
        height: 400,
        margin: { t: 90, r: 50, l: 80, b: 80 },
        plot_bgcolor: colors.background,
        paper_bgcolor: colors.background,
        font: { color: colors.text },
        legend: { 
            font: { color: colors.text },
            orientation: 'h',
            y: -0.3,
            xanchor: 'center',
            x: 0.5
        },
        showlegend: true,
        uniformtext: { mode: 'hide', minsize: 12 }
    };
    const config = { responsive: true, displayModeBar: false };
    Plotly.newPlot('sentimentChart', [trace1, trace2], layout, config);
    // Mostrar conclusión automática
    document.getElementById('sentimentConclusion').innerHTML = `<b>Conclusión:</b> ${data.summary}`;
}

function createRadarChart(data) {
    const colors = getChartColors();
    const model1Name = document.querySelector('[name="model1"]').value;
    const model2Name = document.querySelector('[name="model2"]').value;
    const thetaLabels = [
        'Intensidad Ideológica',
        'Polarización del Lenguaje',
        'Diversidad de Temas',
        'Riqueza de Argumentación'
    ];
    const trace1 = {
        type: 'scatterpolar',
        r: [
            Math.abs(data.model1.political_orientation),
            Math.abs(data.model1.sentiment),
            Math.min(1, data.model1.main_topics.length / 3),
            Math.min(1, data.model1.adjectives.length / 5)
        ],
        theta: thetaLabels,
        fill: 'toself',
        name: model1Name,
        line: { color: colors.blue },
        marker: { size: 8 },
        hovertemplate: '%{theta}: %{r:.2f}<extra>' + model1Name + '</extra>'
    };
    const trace2 = {
        type: 'scatterpolar',
        r: [
            Math.abs(data.model2.political_orientation),
            Math.abs(data.model2.sentiment),
            Math.min(1, data.model2.main_topics.length / 3),
            Math.min(1, data.model2.adjectives.length / 5)
        ],
        theta: thetaLabels,
        fill: 'toself',
        name: model2Name,
        line: { color: colors.green },
        marker: { size: 8 },
        hovertemplate: '%{theta}: %{r:.2f}<extra>' + model2Name + '</extra>'
    };
    const layout = {
        autosize: true,
        polar: {
            radialaxis: {
                visible: true,
                range: [0, 1],
                color: colors.text,
                gridcolor: colors.grid,
                tickfont: { size: 13 },
                angle: 90,
                automargin: true
            },
            angularaxis: {
                color: colors.text,
                gridcolor: colors.grid,
                tickfont: { size: 14 },
                automargin: true
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
        },
        uniformtext: { mode: 'hide', minsize: 12 }
    };
    const config = { responsive: true, displayModeBar: false };
    Plotly.newPlot('radarChart', [trace1, trace2], layout, config);
}

function createWordCloud(data) {
    const colors = getChartColors();
    // Mostrar adjetivos duplicados si aparecen en ambos modelos
    const adj1 = data.model1.adjectives || [];
    const adj2 = data.model2.adjectives || [];
    let allAdjectives = [];
    adj1.forEach(word => allAdjectives.push({text: word, model: 'model1'}));
    adj2.forEach(word => allAdjectives.push({text: word, model: 'model2'}));
    // Contar frecuencia por modelo
    const wordFreq = {};
    allAdjectives.forEach(({text, model}) => {
        const key = text + '_' + model;
        wordFreq[key] = (wordFreq[key] || 0) + 1;
    });
    // Convertir a formato necesario para d3-cloud
    const words = Object.entries(wordFreq).map(([key, size]) => {
        const [text, model] = key.split('_');
        return {text, size: size * 25 + 20, model};
    });
    const width = document.getElementById('wordCloud').clientWidth;
    const height = document.getElementById('wordCloud').clientHeight;
    const layout = d3.layout.cloud()
        .size([width || 500, height || 400])
        .words(words)
        .padding(25)
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
            .append("title")
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

// Gráficos para modo single
function createSentimentChartSingle(data) {
    const colors = getChartColors();
    const trace = {
        x: ['Sentimiento', 'Magnitud'],
        y: [data.model1.sentiment, data.model1.magnitude],
        name: document.querySelector('[name="model1"]').value,
        type: 'bar',
        marker: { color: colors.blue },
        text: [
            data.model1.sentiment.toFixed(2),
            data.model1.magnitude.toFixed(2)
        ],
        textposition: 'auto',
    };
    const layout = {
        barmode: 'group',
        autosize: true,
        yaxis: {
            title: {
                text: 'Valor',
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
                text: 'Métricas de Sentimiento',
                font: { size: 14 }
            }
        },
        height: 350,
        margin: { t: 50, r: 50, l: 80, b: 80 },
        plot_bgcolor: colors.background,
        paper_bgcolor: colors.background,
        font: { color: colors.text },
        legend: { font: { color: colors.text }, orientation: 'h', y: -0.3, xanchor: 'center', x: 0.5 }
    };
    const config = { responsive: true, displayModeBar: false };
    Plotly.newPlot('sentimentChart', [trace], layout, config);
}

function createRadarChartSingle(data) {
    const colors = getChartColors();
    const model1Name = document.querySelector('[name="model1"]').value;
    const trace = {
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
        legend: { font: { color: colors.text }, orientation: 'h', y: -0.2, xanchor: 'center', x: 0.5 }
    };
    const config = { responsive: true, displayModeBar: false };
    Plotly.newPlot('radarChart', [trace], layout, config);
}

function createWordCloudSingle(data) {
    // Reutiliza la función normal pero solo con model1
    createWordCloud({ model1: data.model1, model2: { adjectives: [] } });
}

// NUEVO: Gráfico de Compass Político (cuadrantes)
function createCompassChart(data, width, height) {
    const colors = getChartColors();

    const model1 = data.model1;
    const model2 = data.model2;
    const model1Name = document.querySelector('[name="model1"]').value;
    const model2Name = document.querySelector('[name="model2"]').value;

    const traces = [
        {
            x: [model1.political_orientation],
            y: [model1.social_orientation],
            mode: 'markers+text',
            name: model1Name,
            marker: { color: colors.blue, size: 22, line: { color: '#fff', width: 2 } },
            text: [model1Name],
            textposition: 'top center',
            hovertemplate: `${model1Name}<br>X: %{x:.2f}<br>Y: %{y:.2f}<extra></extra>`
        }
    ];

    // Only add model2 trace if it exists and has valid data
    if (model2 && typeof model2.political_orientation === 'number' && typeof model2.social_orientation === 'number') {
        traces.push({
            x: [model2.political_orientation],
            y: [model2.social_orientation],
            mode: 'markers+text',
            name: model2Name,
            marker: { color: colors.green, size: 22, line: { color: '#fff', width: 2 } },
            text: [model2Name],
            textposition: 'top center',
            hovertemplate: `${model2Name}<br>X: %{x:.2f}<br>Y: %{y:.2f}<extra></extra>`
        });
    }

    const layout = {
        // Rely on autosize: true and container size (CSS handles explicit dimensions)
        autosize: true,
        xaxis: {
            range: [-1.1, 1.1],
            zeroline: true,
            zerolinewidth: 3,
            zerolinecolor: colors.text,
            title: { text: '', font: { size: 15 } },
            color: colors.text,
            gridcolor: colors.grid,
            tickvals: [],
            ticktext: [],
            tickfont: { size: 18, family: 'Arial' },
            tickangle: 0,
            automargin: true,
            showline: true,
            linecolor: colors.text,
            linewidth: 2,
            mirror: true,
            tickpadding: 20
        },
        yaxis: {
            range: [-1.1, 1.1],
            zeroline: true,
            zerolinewidth: 3,
            zerolinecolor: colors.text,
            title: { text: '', font: { size: 15 } },
            color: colors.text,
            gridcolor: colors.grid,
            tickvals: [],
            ticktext: [],
            tickfont: { size: 18, family: 'Arial' },
            tickangle: 0,
            automargin: true,
            showline: true,
            linecolor: colors.text,
            linewidth: 2,
            mirror: true,
            tickpadding: 20
        },
        // Adjust margins for annotations and legend
        margin: { t: 80, r: 150, l: 150, b: 300 }, // Further increased left/right and bottom margin
        plot_bgcolor: colors.background,
        paper_bgcolor: colors.background,
        font: { color: colors.text },
        showlegend: true,
        legend: {
            font: { color: colors.text, size: 16 },
            orientation: 'h',
            y: -0.7, // Further lower the legend position
            xanchor: 'center',
            x: 0.5,
            itemwidth: 300, // Further increase item width
            borderwidth: 0,
            itemclick: false,
            itemdoubleclick: false,
            traceorder: 'normal',
            bgcolor: 'rgba(0,0,0,0)', // Transparent background
            itembgcolor: 'rgba(0,0,0,0)', // Transparent item background
            entrywidth: 300 // Explicitly set entry width
        },
        shapes: [
            // Ejes
            { type: 'line', x0: 0, x1: 0, y0: -1.1, y1: 1.1, line: { color: colors.text, width: 2, dash: 'dot' } },
            { type: 'line', x0: -1.1, x1: 1.1, y0: 0, y1: 0, line: { color: colors.text, width: 2, dash: 'dot' } }
        ],
        annotations: [
            // izquierda (vertical, outside plot area)
            {
                x: -1.15, y: 0, xref: 'x', yref: 'y',
                text: 'izquierda',
                showarrow: false, font: { size: 18, color: '#111827' }, align: 'center',
                xanchor: 'center', yanchor: 'middle',
                xshift: -10, yshift: 0,
                textangle: -90
            },
            // derecha (vertical, outside plot area)
            {
                x: 1.15, y: 0, xref: 'x', yref: 'y',
                text: 'derecha',
                showarrow: false, font: { size: 18, color: '#111827' }, align: 'center',
                xanchor: 'center', yanchor: 'middle',
                xshift: 10, yshift: 0,
                textangle: 90
            },
            // autoritario (top, outside plot area)
            {
                x: 0, y: 1.1, xref: 'x', yref: 'y',
                text: 'autoritario',
                showarrow: false, font: { size: 18, color: '#111827' }, align: 'center',
                xanchor: 'center', yanchor: 'bottom',
                xshift: 0, yshift: 0
            },
            // libertario (bottom, outside plot area)
            {
                x: 0, y: -1.1, xref: 'x', yref: 'y',
                text: 'libertario',
                showarrow: false, font: { size: 18, color: '#111827' }, align: 'center',
                xanchor: 'center', yanchor: 'top',
                xshift: 0, yshift: 0
            }
        ]
    };

    const config = {
        responsive: true,
        displayModeBar: false,
        displaylogo: false,
        modeBarButtonsToRemove: [
            'toggleSpikelines', 'autoScale2d', 'resetScale2d', 'hoverClosestCartesian',
            'hoverCompareCartesian', 'editInChartStudio', 'sendDataToCloud', 'zoom2d',
            'pan2d', 'select2d', 'lasso2d',
            'toImage', // Remove download button too
            'toggleHover', 'hoverClosest' 
        ],
        showTips: false,
        staticPlot: false
    };

    return { traces, layout, config };
}

// Gráfico de Orientación Política (comparación) - Llama a createCompassChart
let politicalChartObserver = null; // Keep track of the observer

function createPoliticalChart(data) {
    const politicalChartDiv = document.getElementById('politicalChart');
    if (!politicalChartDiv) {
        console.error('Political chart div not found!');
        return;
    }
    
    // Disconnect previous observer if it exists
    if(politicalChartObserver) {
        politicalChartObserver.disconnect();
        politicalChartObserver = null;
    }

    // Clear the div before creating the new chart
    politicalChartDiv.innerHTML = '';
    
    // Get current dimensions - removed explicit passing, relying on autosize with robust container
    // const containerWidth = politicalChartDiv.clientWidth;
    // const containerHeight = politicalChartDiv.clientHeight;

    const { traces, layout, config } = createCompassChart(data); // Removed dimension arguments
    
    Plotly.newPlot('politicalChart', traces, layout, config);

    setPoliticalExplanation();
    
    // Use ResizeObserver to ensure the chart redraws when its container resizes
    politicalChartObserver = new ResizeObserver(() => {
        Plotly.relayout('politicalChart', { autosize: true });
    });
    politicalChartObserver.observe(politicalChartDiv);
}

// Gráfico de Orientación Política (single) - Llama a createCompassChart
let politicalChartSingleObserver = null; // Keep track of the observer

function createPoliticalChartSingle(data) {
    const politicalChartDiv = document.getElementById('politicalChart');
    if (!politicalChartDiv) {
        console.error('Political chart div not found!');
        return;
    }

     // Disconnect previous observer if it exists
     if(politicalChartSingleObserver) {
        politicalChartSingleObserver.disconnect();
        politicalChartSingleObserver = null;
    }

    // Clear the div before creating the new chart
    politicalChartDiv.innerHTML = '';
    
    // Get current dimensions - removed explicit passing, relying on autosize with robust container
    // const containerWidth = politicalChartDiv.clientWidth;
    // const containerHeight = politicalChartDiv.clientHeight;

    const { traces, layout, config } = createCompassChart({ model1: data.model1 }); // Removed dimension arguments

    Plotly.newPlot('politicalChart', traces, layout, config);

    setPoliticalExplanation();
     
     // Use ResizeObserver to ensure the chart redraws when its container resizes
    politicalChartSingleObserver = new ResizeObserver(() => {
        Plotly.relayout('politicalChart', { autosize: true });
    });
    politicalChartSingleObserver.observe(politicalChartDiv);
}

// NUEVO: Explicación para orientación política
function setPoliticalExplanation() {
    document.getElementById('politicalExplanation').innerHTML =
        `<b>¿Qué significa la orientación política?</b><br>
        <span class='block'>
        Valor entre -1 (izquierda) y 1 (derecha). 0 indica centro o neutralidad.<br>
        <b>Ejemplo:</b> Un valor cercano a -1 sugiere sesgo hacia la izquierda, mientras que un valor cercano a 1 indica sesgo hacia la derecha.<br>
        <b>Contexto:</b> El análisis considera el espectro político argentino.
        </span>`;
}

// Tooltips explicativos para los títulos de los gráficos
function setGraphTooltips() {
    const tooltips = {
        'sentimentTitle': `\
<b>Análisis de Sentimiento y Magnitud</b><br>
<b>Sentimiento:</b> Tono general de la respuesta, de -1 (muy negativo) a 1 (muy positivo).<br>
<b>Magnitud:</b> Intensidad emocional total, siempre positiva. Un valor alto indica mayor carga emocional, aunque sea mixta.<br>
<b>Cálculo:</b> El modelo Gemini analiza el texto y asigna ambos valores según el lenguaje y la actitud.<br>
<b>Ejemplo:</b> Una respuesta puede ser neutral (sentimiento ≈ 0) pero con magnitud alta si expresa emociones intensas tanto positivas como negativas.`,
        'politicalTitle': `\
<b>Orientación Política</b><br>
Mide el sesgo ideológico de la respuesta en el eje izquierda (-1) a derecha (1).<br>
<b>Cálculo:</b> El modelo Gemini analiza el texto y asigna un valor según la postura política detectada.<br>
<b>Ejemplo:</b> Un valor cercano a -1 sugiere sesgo hacia la izquierda, mientras que un valor cercano a 1 indica sesgo hacia la derecha.`,
        'radarTitle': `\
<b>Radar de Métricas</b><br>
Compara varias métricas de la respuesta:<br>
- <b>Intensidad del Sentimiento:</b> Valor absoluto del sentimiento (-1 a 1).<br>
- <b>Intensidad Ideológica:</b> Valor absoluto de la orientación política (-1 a 1).<br>
- <b>Diversidad de Temas:</b> Cantidad de temas principales detectados (normalizado).<br>
- <b>Riqueza de Lenguaje:</b> Cantidad de adjetivos detectados (normalizado).<br>
<b>Cálculo:</b> Todas las métricas se normalizan entre 0 y 1 para comparar la "fuerza" de cada aspecto en la respuesta.`,
        'wordCloudTitle': `\
<b>Nube de Adjetivos</b><br>
Muestra los adjetivos más relevantes usados en las respuestas.<br>
<b>Cálculo:</b> El modelo Gemini extrae los adjetivos más representativos.<br>
<b>Color:</b> Azul = Modelo 1, Verde = Modelo 2. Si un adjetivo aparece en ambos, se muestra dos veces (una por cada modelo).<br>
<b>Tamaño:</b> Indica la frecuencia del adjetivo en la respuesta.`
    };
    [
        {id: 'sentimentTitle', selector: '#sentimentTitle'},
        {id: 'politicalTitle', selector: '#politicalTitle'},
        {id: 'radarTitle', selector: '#radarTitle'},
        {id: 'wordCloudTitle', selector: '#wordCloudTitle'}
    ].forEach(({id, selector}) => {
        const el = document.querySelector(selector);
        if (el) {
            el.setAttribute('title', '');
            el.onmouseenter = (e) => {
                showTooltip(e, tooltips[id]);
            };
            el.onmouseleave = hideTooltip;
        }
    });
}

function showTooltip(e, html) {
    let tooltip = document.getElementById('customTooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'customTooltip';
        tooltip.style.position = 'fixed';
        tooltip.style.zIndex = 9999;
        tooltip.style.background = 'rgba(30,41,59,0.95)';
        tooltip.style.color = '#fff';
        tooltip.style.padding = '12px 16px';
        tooltip.style.borderRadius = '8px';
        tooltip.style.fontSize = '15px';
        tooltip.style.maxWidth = '350px';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
        document.body.appendChild(tooltip);
    }
    tooltip.innerHTML = html;
    tooltip.style.display = 'block';
    tooltip.style.left = (e.clientX + 20) + 'px';
    tooltip.style.top = (e.clientY + 10) + 'px';
}
function hideTooltip() {
    const tooltip = document.getElementById('customTooltip');
    if (tooltip) tooltip.style.display = 'none';
} 