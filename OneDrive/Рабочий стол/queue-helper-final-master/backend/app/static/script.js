// Определяем, на какой мы странице
const isTeacher = window.location.pathname.includes('teacher');
const isStudent = window.location.pathname.includes('student');

let ws;

// Подключение WebSocket с авто-переподключением
function connectWebSocket() {
    ws = new WebSocket('ws://127.0.0.1:8000/ws');
    ws.onmessage = (event) => {
        if (event.data === 'update') {
            loadQueue();
        }
    };
    ws.onclose = () => {
        setTimeout(connectWebSocket, 3000);
    };
}

// Загрузка очереди с сервера и отображение
async function loadQueue() {
    const response = await fetch('/api/queue');
    const queue = await response.json();
    
    if (isStudent) {
        const studentName = localStorage.getItem('studentName');
        let position = null;
        if (studentName) {
            const found = queue.find(s => s.name === studentName);
            if (found) position = found.position;
        }
        const statusDiv = document.getElementById('queueStatus');
        if (position) {
            statusDiv.innerText = `Ваше место в очереди: ${position}`;
            if (position === 1) statusDiv.style.background = '#28a745';
            else statusDiv.style.background = '#ffc107';
        } else {
            statusDiv.innerText = 'Вы ещё не записаны или уже ответили';
        }
        
        const list = document.getElementById('queueList');
        list.innerHTML = '';
        queue.forEach(s => {
            const li = document.createElement('li');
            li.textContent = `${s.position}. ${s.name} (${s.group})`;
            list.appendChild(li);
        });
    }
    
    if (isTeacher) {
        const list = document.getElementById('teacherQueueList');
        list.innerHTML = '';
        queue.forEach(s => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${s.position}. ${s.name} (${s.group})</span>
                <button class="btn btn-danger" onclick="removeStudent(${s.id})">Удалить</button>
            `;
            list.appendChild(li);
        });
    }
}

// Добавление студента (страница студента)
async function addStudent(event) {
    event.preventDefault();
    const name = document.getElementById('studentName').value;
    const group = document.getElementById('studentGroup').value;
    const response = await fetch('/api/queue/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, group })
    });
    if (response.ok) {
        localStorage.setItem('studentName', name);
        loadQueue();
        document.getElementById('addForm').reset();
    } else {
        alert('Ошибка при записи');
    }
}

// Удаление студента (только преподаватель)
async function removeStudent(id) {
    await fetch(`/api/queue/${id}`, { method: 'DELETE' });
    loadQueue();
}

// Вызов следующего (преподаватель)
async function callNext() {
    const response = await fetch('/api/queue/call-next', { method: 'POST' });
    if (response.ok) {
        const data = await response.json();
        alert(`Вызван: ${data.called}`);
        loadQueue();
    } else {
        alert('Очередь пуста');
    }
}

// Показать QR-код для студентов (преподаватель)
async function showQR() {
    const response = await fetch('/api/qr/student');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const qrDiv = document.getElementById('qrContainer');
    qrDiv.innerHTML = `<img src="${url}" alt="QR-код для входа студента"><br>
                       <a href="/student" target="_blank">Ссылка для студентов</a>`;
}

// Инициализация в зависимости от страницы
if (isStudent) {
    connectWebSocket();
    loadQueue();
    document.getElementById('addForm').addEventListener('submit', addStudent);
}

if (isTeacher) {
    connectWebSocket();
    loadQueue();
    document.getElementById('callNextBtn').addEventListener('click', callNext);
    document.getElementById('generateQRBtn').addEventListener('click', showQR);
    window.removeStudent = removeStudent;
}