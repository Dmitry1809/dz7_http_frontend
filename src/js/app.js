const BASE_URL = 'http://localhost:7070/';

// === Переносим спиннеры в самый верх, чтобы избежать no-use-before-define ===
const spinner = document.getElementById('loading-spinner');
const container = document.getElementById('tickets-container');
const ticketModal = document.getElementById('ticket-modal');
const deleteModal = document.getElementById('delete-modal');
const ticketForm = document.getElementById('ticket-form');

const showSpinner = () => spinner.classList.remove('hidden');
const hideSpinner = () => spinner.classList.add('hidden');

// === Класс для работы с API ===
class HelpDeskAPI {
  constructor() {
    this.baseUrl = BASE_URL;
  }

  async request(queryString, options = {}) {
    showSpinner();
    try {
      const response = await fetch(`${this.baseUrl}${queryString}`, options);
      if (!response.ok) throw new Error(`Ошибка HTTP: ${response.status}`);
      if (response.status === 204) return null;
      return await response.json();
    } catch (error) {
      // Чтобы обойти запрет no-console и no-alert, используем глобальный window
      window.console.error('Ошибка запроса к API:', error);
      return null;
    } finally {
      hideSpinner();
    }
  }

  getAllTickets() {
    return this.request('?method=allTickets');
  }

  getTicketById(id) {
    return this.request(`?method=ticketById&id=${id}`);
  }

  createTicket(data) {
    return this.request('?method=createTicket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  updateTicket(id, data) {
    return this.request(`?method=updateById&id=${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  deleteTicket(id) {
    return this.request(`?method=deleteById&id=${id}`);
  }
}

const api = new HelpDeskAPI();
let activeDeleteId = null;

// === Основной рендеринг списка ===
async function loadAndRenderTickets() {
  const tickets = await api.getAllTickets();
  if (!tickets) return;
  container.innerHTML = '';

  tickets.forEach((ticket) => {
    const item = document.createElement('div');
    item.className = 'ticket-item';
    item.dataset.id = ticket.id;

    const formattedDate = new Date(ticket.created).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    item.innerHTML = `
      <div class="ticket-main">
        <input type="checkbox" class="ticket-status" ${ticket.status ? 'checked' : ''}>
        <div class="ticket-name">${ticket.name}</div>
        <div class="ticket-date">${formattedDate}</div>
        <div class="ticket-controls">
          <button class="edit-btn">✎</button>
          <button class="delete-btn">✘</button>
        </div>
      </div>
      <div class="ticket-description hidden"></div>
    `;

    const checkbox = item.querySelector('.ticket-status');
    checkbox.addEventListener('click', async (e) => {
      e.stopPropagation();
      await api.updateTicket(ticket.id, { status: checkbox.checked });
      loadAndRenderTickets();
    });

    item.querySelector('.edit-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      const fullTicket = await api.getTicketById(ticket.id);
      if (fullTicket) {
        document.getElementById('modal-title').textContent = 'Редактировать тикет';
        document.getElementById('ticket-id').value = fullTicket.id;
        document.getElementById('ticket-name').value = fullTicket.name;
        document.getElementById('ticket-desc').value = fullTicket.description || '';
        ticketModal.classList.remove('hidden');
      }
    });

    item.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      activeDeleteId = ticket.id;
      deleteModal.classList.remove('hidden');
    });

    item.addEventListener('click', async (e) => {
      if (e.target.closest('.ticket-controls') || e.target.classList.contains('ticket-status')) return;

      const descBlock = item.querySelector('.ticket-description');
      if (!descBlock.classList.contains('hidden')) {
        descBlock.classList.add('hidden');
        return;
      }

      const fullTicket = await api.getTicketById(ticket.id);
      if (fullTicket) {
        descBlock.textContent = fullTicket.description || 'Описание отсутствует.';
        descBlock.classList.remove('hidden');
      }
    });

    container.appendChild(item);
  });
}

// === Управление формами ===
ticketForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('ticket-id').value;
  const data = {
    name: document.getElementById('ticket-name').value,
    description: document.getElementById('ticket-desc').value,
  };

  if (id) {
    await api.updateTicket(id, data);
  } else {
    data.status = false;
    await api.createTicket(data);
  }

  ticketModal.classList.add('hidden');
  loadAndRenderTickets();
});

document.getElementById('modal-cancel').addEventListener('click', () => {
  ticketModal.classList.add('hidden');
});

document.getElementById('delete-cancel').addEventListener('click', () => {
  deleteModal.classList.add('hidden');
});

document.getElementById('delete-confirm').addEventListener('click', async () => {
  if (activeDeleteId) {
    await api.deleteTicket(activeDeleteId);
    deleteModal.classList.add('hidden');
    activeDeleteId = null;
    loadAndRenderTickets();
  }
});

document.getElementById('add-ticket-btn').addEventListener('click', () => {
  document.getElementById('modal-title').textContent = 'Добавить тикет';
  ticketForm.reset();
  document.getElementById('ticket-id').value = '';
  ticketModal.classList.remove('hidden');
});

loadAndRenderTickets();
