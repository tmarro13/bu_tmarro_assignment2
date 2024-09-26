let chart;
let data;
let centroids;
let labels;
let step = 0;
let hasConverged = false;

function initChart() {
    const ctx = document.getElementById('chart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Data Points',
                data: [],
                backgroundColor: 'rgba(0, 0, 255, 0.5)'
            }, {
                label: 'Centroids',
                data: [],
                backgroundColor: 'rgba(255, 0, 0, 1)',
                pointRadius: 8
            }]
        },
        options: {
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    min: 0,
                    max: 100
                },
                y: {
                    min: 0,
                    max: 100
                }
            }
        }
    });
    console.log('Chart initialized');
}

function generateData() {
    console.log('Generating new data');
    fetch('/generate_data', { method: 'POST' })
        .then(response => response.json())
        .then(newData => {
            data = newData;
            centroids = null;
            labels = null;
            step = 0;
            hasConverged = false;
            console.log(`Generated ${data.length} data points`);
            updateChart();
            updateStatus('New data generated. Click Step to start clustering.');
        })
        .catch(error => console.error('Error generating data:', error));
}

function updateChart() {
    console.log('Updating chart');
    chart.data.datasets[0].data = data.map((point, index) => ({
        x: point[0],
        y: point[1],
        backgroundColor: labels ? getColor(labels[index]) : 'rgba(0, 0, 255, 0.5)'
    }));
    chart.data.datasets[1].data = centroids ? centroids.map(point => ({
        x: point[0],
        y: point[1]
    })) : [];
    chart.update();
    console.log(`Chart updated with ${data.length} points and ${centroids ? centroids.length : 0} centroids`);
}

function getColor(label) {
    const colors = [
        'rgba(255, 0, 0, 0.5)',
        'rgba(0, 255, 0, 0.5)',
        'rgba(0, 0, 255, 0.5)',
        'rgba(255, 255, 0, 0.5)',
        'rgba(255, 0, 255, 0.5)',
        'rgba(0, 255, 255, 0.5)'
    ];
    return colors[label % colors.length];
}

function updateButtonStates() {
    const initMethod = document.getElementById('initMethod').value;
    const k = parseInt(document.getElementById('kClusters').value);
    const stepButton = document.getElementById('step');
    const convergeButton = document.getElementById('converge');

    if (initMethod === 'manual') {
        const isReady = centroids.length === k;
        stepButton.disabled = !isReady;
        convergeButton.disabled = !isReady;
        updateStatus(isReady ? 'Ready to start clustering' : `Place ${k - centroids.length} more centroid(s)`);
    } else {
        stepButton.disabled = false;
        convergeButton.disabled = false;
    }
}
function runKMeansStep() {
    if (!data || hasConverged) return;
    
    const initMethod = document.getElementById('initMethod').value;
    const k = parseInt(document.getElementById('kClusters').value);

    if (initMethod === 'manual' && centroids.length !== k) {
        updateStatus(`Place ${k - centroids.length} more centroid(s) before starting`);
        return;
    }

    fetch('/run_kmeans_step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            data: data,
            k: k,
            initMethod: initMethod,
            step: step,
            initialCentroids: initMethod === 'manual' ? centroids : null
        }),
    })
    .then(response => response.json())
    .then(result => {
        centroids = result.centroids;
        labels = result.labels;
        step = result.step;
        hasConverged = result.converged;
        updateChart();
        updateStatus(hasConverged ? 'KMeans has converged!' : `Step ${step} completed`);
    })
    .catch(error => console.error('Error in KMeans step:', error));
}

function runKMeansConverge() {
    if (!data || hasConverged) return;
    
    const initMethod = document.getElementById('initMethod').value;
    const k = parseInt(document.getElementById('kClusters').value);

    if (initMethod === 'manual' && centroids.length !== k) {
        updateStatus(`Place ${k - centroids.length} more centroid(s) before starting`);
        return;
    }

    fetch('/run_kmeans_converge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            data: data,
            k: k,
            initMethod: initMethod,
            initialCentroids: initMethod === 'manual' ? centroids : null
        }),
    })
    .then(response => response.json())
    .then(result => {
        centroids = result.centroids;
        labels = result.labels;
        step = result.step;
        hasConverged = true;
        updateChart();
        updateStatus('KMeans has converged!');
    })
    .catch(error => console.error('Error in KMeans converge:', error));
}

function reset() {
    centroids = [];
    labels = null;
    step = 0;
    hasConverged = false;
    updateChart();
    updateStatus('Reset complete. Generate new data or start clustering.');
    updateButtonStates();
}

function updateStatus(message) {
    document.getElementById('status').textContent = message;
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('generateData').addEventListener('click', generateData);
    document.getElementById('step').addEventListener('click', runKMeansStep);
    document.getElementById('converge').addEventListener('click', runKMeansConverge);
    document.getElementById('reset').addEventListener('click', reset);
    document.getElementById('initMethod').addEventListener('change', updateButtonStates);
    document.getElementById('kClusters').addEventListener('change', updateButtonStates);

    document.getElementById('chart').addEventListener('click', (event) => {
        if (document.getElementById('initMethod').value === 'manual') {
            const rect = chart.canvas.getBoundingClientRect();
            const x = chart.scales.x.getValueForPixel(event.clientX - rect.left);
            const y = chart.scales.y.getValueForPixel(event.clientY - rect.top);
            const k = parseInt(document.getElementById('kClusters').value);
            
            if (centroids.length < k) {
                centroids.push([x, y]);
                updateChart();
                updateStatus(`Centroid ${centroids.length} of ${k} placed`);
                updateButtonStates();
            } else {
                updateStatus(`All ${k} centroids have been placed`);
            }
        }
    });

    initChart();
    generateData();
    updateButtonStates();
});