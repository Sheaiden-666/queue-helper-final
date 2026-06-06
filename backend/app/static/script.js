// Определяем страницу
const isTeacher = window.location.pathname.includes('teacher');
const isStudent = window.location.pathname.includes('student');

let ws;
let currentStudentName = null;

// WebSocket для живых обновлений
function connectWebSocket() {
    ws = new WebSocket('ws://127.0.0.1:8000/ws');
    ws.onmessage = (event) => {
        if (event.data === 'update') loadQueue();
    };
    ws.onclose = () => setTimeout(connectWebSocket, 3000);
}

// Загрузка очереди с сервера и отображение
async function loadQueue() {
    const response = await fetch('/api/queue');
    const queue = await response.json();

    if (isStudent) {
        // Находим позицию текущего студента по имени (email)
        let position = null;
        if (currentStudentName) {
            const found = queue.find(s => s.name === currentStudentName);
            if (found) position = found.position;
        }
        const statusDiv = document.getElementById('queueStatus');
        if (position) {
            statusDiv.innerText = `Ваше место в очереди: ${position}`;
            statusDiv.style.background = position === 1 ? '#c8e6d9' : '#ffecb3';
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
        if (list) {
            list.innerHTML = '';
            queue.forEach(s => {
                const li = document.createElement('li');
                li.innerHTML = `<span>${s.position}. ${s.name} (${s.group})</span>
                                <button class="btn btn-danger" onclick="removeStudent(${s.id})">Удалить</button>`;
                list.appendChild(li);
            });
        }
    }
}

// Добавление студента (используем email + group)
async function addStudent(event) {
    event.preventDefault();
    const name = document.getElementById('studentName').value;   // email
    const group = document.getElementById('studentGroup').value;
    const password = document.getElementById('studentPassword')?.value || '';

    if (!name || !group) {
        alert('Заполните Email и Группу');
        return;
    }

    const response = await fetch('/api/queue/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, group })
    });

    const msgDiv = document.getElementById('message');
    if (response.ok) {
        currentStudentName = name;
        localStorage.setItem('studentName', name);
        msgDiv.style.display = 'block';
        msgDiv.innerText = '✅ Вы записаны в очередь!';
        msgDiv.style.color = '#2c7a4d';
        loadQueue();
        document.getElementById('addForm').reset();
        setTimeout(() => msgDiv.style.display = 'none', 3000);
    } else {
        msgDiv.style.display = 'block';
        msgDiv.innerText = '❌ Ошибка при записи. Попробуйте позже.';
        msgDiv.style.color = '#c44536';
        setTimeout(() => msgDiv.style.display = 'none', 3000);
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

// Генерация QR-кода для регистрации студентов
async function showQR() {
    const response = await fetch('/api/qr/student');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const qrDiv = document.getElementById('qrContainer');
    qrDiv.innerHTML = `<img src="${url}" alt="QR-код"><br><a href="/student" target="_blank">Ссылка для студентов</a>`;
}

// Инициализация в зависимости от страницы
if (isStudent) {
    currentStudentName = localStorage.getItem('studentName');
    connectWebSocket();
    loadQueue();
    document.getElementById('addForm').addEventListener('submit', addStudent);
}

if (isTeacher) {
    connectWebSocket();
    loadQueue();
    document.getElementById('callNextBtn').addEventListener('click', callNext);
    const qrBtn = document.getElementById('generateQRBtn');
    if (qrBtn) qrBtn.addEventListener('click', showQR);
    window.removeStudent = removeStudent; // чтобы был доступ из onclick
}
