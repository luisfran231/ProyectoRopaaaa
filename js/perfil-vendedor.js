document.addEventListener('DOMContentLoaded', () => {
  const auth = firebase.auth();
  const db   = firebase.firestore();

  /* ====== UI base (header) ====== */
  const logoutButton = document.getElementById('logout-button');

  /* ====== Perfil visible ====== */
  const sellerProfilePicture   = document.getElementById('seller-profile-picture');
  const sellerUsername         = document.getElementById('seller-username');
  const ordersCountEl          = document.getElementById('orders-count');
  const productsCountEl        = document.getElementById('products-count');
  const sellerPhoneEl          = document.getElementById('seller-phone');
  const sellerWhatsappLink = document.getElementById('seller-whatsapp-link');
  const sellerFacebookLink = document.getElementById('seller-facebook-link');
  const sellerInstagramLink = document.getElementById('seller-instagram-link');

  /* ====== Calificaciones ====== */
  const myRatingsWrap       = document.getElementById('my-ratings');
  const detailedRatingsList = document.getElementById('detailed-ratings-list');
  const rateSellerSection   = document.getElementById('rate-seller-section');
  const ratingForm          = document.getElementById('rating-form');
  const ratingStars         = ratingForm?.querySelectorAll('.star');
  const ratingValue         = document.getElementById('rating-value');
  const ratingComment       = document.getElementById('rating-comment');

  /* ====== Editar perfil (modal + form) ====== */
  const editSellerProfileBtn   = document.getElementById('edit-seller-profile-btn');
  const editSellerProfileModal = document.getElementById('edit-seller-profile-modal');
  const closeBtnSellerProfile  = editSellerProfileModal?.querySelector('.close-button-seller-profile');

  const editSellerForm   = document.getElementById('edit-seller-profile-form');
  const fUsername        = document.getElementById('edit-seller-username');
  const fPhone           = document.getElementById('edit-seller-phone');
  const fWhatsapp        = document.getElementById('edit-seller-whatsapp');
  const fFacebook        = document.getElementById('edit-seller-facebook');
  const fInstagram       = document.getElementById('edit-seller-instagram');
  const profileInput     = document.getElementById('profile-image-upload');
  const profileStatus    = document.getElementById('profile-image-upload-status');
  const profileUrlHidden = document.getElementById('profile-image-url');
  const currentPreview   = document.getElementById('current-profile-picture');

  /* ====== Editar Calificación (modal + form) ====== */
  const editRatingModal = document.getElementById('edit-rating-modal');
  const closeEditRatingBtn = editRatingModal?.querySelector('.close-button');
  const editRatingForm = document.getElementById('edit-rating-form');
  const editRatingId = document.getElementById('edit-rating-id');
  const editRatingStars = editRatingForm?.querySelectorAll('.star');
  const editRatingValue = document.getElementById('edit-rating-value');
  const editRatingComment = document.getElementById('edit-rating-comment');


  const CLOUD_NAME = 'dvdctjltz';
  
  const PRESETS_TRY = ['perfil-vendedores', 'catalogo-productos'];

  let currentUser;
  let sellerId;

 
  let lastFocused = null;
  let keyHandler  = null;

  function getFocusable(container) {
    return container.querySelectorAll('a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])');
  }
  function openModal(el, focusSel) {
    if (!el) return;
    el.style.display = 'flex';
    document.body.classList.add('modal-open');
    lastFocused = document.activeElement;
    const toFocus = (focusSel && el.querySelector(focusSel)) || getFocusable(el)[0];
    if (toFocus) toFocus.focus();

    el.addEventListener('mousedown', backdropClose);
    function backdropClose(e){ if (e.target === el) closeModal(el); }
    el._backdrop = backdropClose;

    keyHandler = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); closeModal(el); }
      else if (e.key === 'Tab') {
        const nodes = Array.from(getFocusable(el));
        if (!nodes.length) return;
        const first = nodes[0], last = nodes[nodes.length-1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', keyHandler);
  }
  function closeModal(el) {
    if (!el) return;
    el.style.display = 'none';
    document.body.classList.remove('modal-open');
    if (el._backdrop) el.removeEventListener('mousedown', el._backdrop);
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
    if (lastFocused?.focus) lastFocused.focus();
  }

  /* ====== SOLO perfil + calificaciones (sin productos) ====== */
  auth.onAuthStateChanged(async (user) => {
    if (!user) { window.location.href = 'index.html'; return; }

    const udoc = await db.collection('users').doc(user.uid).get();
    if (!udoc.exists) { await auth.signOut(); return; }
    const udata = udoc.data();

    currentUser = user;

    if (udata.role === 'cliente') {
        if (userEmailEl) userEmailEl.style.display = 'none';
        // No profile chip for clients
    } else if (udata.role === 'vendedor') {
        const userNav = document.getElementById('main-nav');
        const logoutButton = document.getElementById('logout-button');
        const profileChip = document.createElement('a');
        profileChip.href = `perfil-vendedor.html?id=${currentUser.uid}`;
        profileChip.className = 'profile-chip';
        profileChip.innerHTML = `
          <img class="chip-avatar" src="${udata.photoUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(udata.username) + '&background=2c2c2c&color=e0e0e0'}" alt="Perfil">
          <span class="chip-name">${udata.username}</span>
        `;

        if(userNav && logoutButton) {
            userNav.insertBefore(profileChip, logoutButton);
        }

        const sidebarContent = document.querySelector('#nav-sidebar .sidebar-content .sidebar-nav');
        if (sidebarContent) {
            sidebarContent.insertBefore(profileChip.cloneNode(true), sidebarContent.firstChild);
        }
    }

    const params = new URLSearchParams(location.search);
    sellerId = params.get('id') || currentUser.uid; // si no hay id, muestra tu propio perfil

    // Carga datos del vendedor
    loadSellerDoc(sellerId, sellerId === currentUser.uid);

    // Conteos
    loadCounts(sellerId);

    // Calificaciones
    loadRatingsSummary(sellerId);
    loadRatingsDetailed(sellerId);

    // Si es mi perfil, activamos botón de editar
    if (sellerId === currentUser.uid) {
      editSellerProfileBtn?.classList.remove('hidden');
    } else {
      editSellerProfileBtn?.classList.add('hidden');
      // Si es un cliente viendo el perfil de otro vendedor, mostrar la sección para calificar
      if (udata.role === 'cliente') {
        db.collection('ratings').where('customerId', '==', currentUser.uid).where('sellerId', '==', sellerId).get().then(snapshot => {
          if (snapshot.empty) {
            rateSellerSection?.classList.remove('hidden');
          }
        });
      }
    }
  });

  logoutButton?.addEventListener('click', () => auth.signOut().then(()=> location.href='index.html'));

  /* ====== Lógica de Calificación ====== */
  if (ratingStars) {
    ratingStars.forEach(star => {
      star.addEventListener('mouseover', () => {
        const value = star.getAttribute('data-value');
        ratingStars.forEach(s => {
          s.classList.toggle('hovered', s.getAttribute('data-value') <= value);
        });
      });

      star.addEventListener('mouseout', () => {
        ratingStars.forEach(s => s.classList.remove('hovered'));
      });

      star.addEventListener('click', () => {
        const value = star.getAttribute('data-value');
        ratingValue.value = value;
        ratingStars.forEach(s => {
          s.classList.toggle('filled', s.getAttribute('data-value') <= value);
        });
      });
    });
  }

  ratingForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser || !sellerId) return;

    const rating = parseInt(ratingValue.value, 10);
    const comment = ratingComment.value.trim();

    if (!rating) {
      alert('Por favor, selecciona una calificación de estrellas.');
      return;
    }

    try {
      const userDoc = await db.collection('users').doc(currentUser.uid).get();
      const username = userDoc.exists ? userDoc.data().username : 'Anónimo';

      await db.collection('ratings').add({
        sellerId: sellerId,
        customerId: currentUser.uid,
        customerUsername: username,
        stars: rating,
        comment: comment,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      alert('¡Gracias por tu calificación!');
      rateSellerSection.classList.add('hidden');
    } catch (error) {
      console.error('Error al guardar la calificación:', error);
      alert('Hubo un error al guardar tu calificación.');
    }
  });

  /* ====== Carga de doc de vendedor ====== */
  function loadSellerDoc(uid, isOwnProfile) {
    db.collection('users').doc(uid).onSnapshot(doc=>{
      if (!doc.exists) return;
      const u = doc.data();

      const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username||'Vendedor')}&background=2c2c2c&color=e0e0e0`;
      sellerProfilePicture.src   = u.photoUrl || fallbackAvatar;
      sellerUsername.textContent = '@' + (u.username || 'vendedor');

      sellerPhoneEl.textContent     = u.phone     || '—';

      if (u.whatsapp) {
        sellerWhatsappLink.href = `https://wa.me/${u.whatsapp.replace(/[^0-9]/g, '')}`;
      } else {
        sellerWhatsappLink.parentElement.style.display = 'none';
      }

      if (u.facebook) {
        sellerFacebookLink.href = `https://facebook.com/${u.facebook}`;
      } else {
        sellerFacebookLink.parentElement.style.display = 'none';
      }

      if (u.instagram) {
        sellerInstagramLink.href = `https://instagram.com/${u.instagram}`;
      } else {
        sellerInstagramLink.parentElement.style.display = 'none';
      }

      // Prefill modal
      if (isOwnProfile) {
        fUsername.value  = u.username || '';
        fPhone.value     = u.phone || '';
        fWhatsapp.value  = u.whatsapp || '';
        fFacebook.value  = u.facebook || '';
        fInstagram.value = u.instagram || '';
        currentPreview.src = u.photoUrl || fallbackAvatar;
        profileUrlHidden.value = u.photoUrl || '';
      }
    });
  }

  /* ====== Conteos ====== */
  function loadCounts(uid){
    db.collection('orders').where('sellerId','==',uid).onSnapshot(s=> { ordersCountEl.textContent   = s.size; });
    db.collection('products').where('sellerId','==',uid).onSnapshot(s=> { productsCountEl.textContent = s.size; });
  }

  /* ====== Calificaciones ====== */
  function loadRatingsSummary(uid){
    db.collection('ratings').where('sellerId','==',uid).onSnapshot(s=>{
      myRatingsWrap.innerHTML = '';
      if (s.empty){
        myRatingsWrap.innerHTML = `
          <div class="average-rating-summary">
            <h3>Promedio de Calificaciones</h3>
            <div class="average-stars">–</div>
            <p>Sin calificaciones</p>
          </div>`;
        return;
      }
      let total = 0;
      s.forEach(d=> total += (d.data().stars||0));
      const avg = total / s.size;

      const box = document.createElement('div');
      box.className = 'average-rating-summary';
      box.innerHTML = `
        <h3>Promedio de Calificaciones</h3>
        <div class="average-stars">${avg.toFixed(1)}</div>
        <p>Basado en ${s.size} calificaciones</p>
      `;
      myRatingsWrap.appendChild(box);
    });
  }

  function loadRatingsDetailed(uid){
    db.collection('ratings').where('sellerId','==',uid).onSnapshot(s=>{
      detailedRatingsList.innerHTML = '';
      if (s.empty){ detailedRatingsList.innerHTML = '<p>Aún no hay calificaciones detalladas.</p>'; return; }
      s.forEach(d=>{
        const r = d.data();
        const ratingId = d.id;
        const item = document.createElement('div');
        item.className = 'rating-item';

        const createdAt = r.createdAt?.toDate();
        const dateString = createdAt ? createdAt.toLocaleDateString('es-ES') : '';

        let editButton = '';
        if (currentUser && currentUser.uid === r.customerId) {
            editButton = `<button class="edit-rating-btn" data-rating-id="${ratingId}">Editar</button>`;
        }

        item.innerHTML = `
          <div class="rating-stars-display">${renderStars(r.stars||0)}</div>
          <p class="rating-comment">${escapeHtml(r.comment||'')}</p>
          <p class="rating-user">- ${r.customerUsername} el ${dateString}</p>
          ${editButton}
        `;
        detailedRatingsList.appendChild(item);
      });
    });
  }

  function renderStars(n){ let h=''; for(let i=1;i<=5;i++) h+=`<span class="star ${i<=n?'filled':''}">★</span>`; return h; }
  function escapeHtml(s){ return s.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

  /* ====== Modal: editar perfil ====== */
  editSellerProfileBtn?.addEventListener('click', ()=> openModal(editSellerProfileModal, '#edit-seller-store-name'));
  closeBtnSellerProfile?.addEventListener('click', ()=> closeModal(editSellerProfileModal));

  // Subida de foto — validación + 2 presets de respaldo
  profileInput?.addEventListener('change', async (e)=>{
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo y tamaño
    const validTypes = ['image/jpeg','image/png','image/webp','image/gif'];
    if (!validTypes.includes(file.type)) {
      setStatus('Formato no permitido. Usa JPG/PNG/WebP/GIF.', 'red'); return;
    }
    const MAX_MB = 5;
    if (file.size > MAX_MB*1024*1024) {
      setStatus(`La imagen supera ${MAX_MB} MB.`, 'red'); return;
    }

    // Subir (intentos sobre presets)
    setStatus('Subiendo foto...', '');
    const result = await uploadToCloudinary(file, PRESETS_TRY);
    if (result.ok) {
      currentPreview.src   = result.url;
      profileUrlHidden.value = result.url;
      setStatus('¡Foto subida con éxito!', 'green');
    } else {
      console.error('Cloudinary error:', result.error);
      setStatus(result.message || 'Error al subir foto. Revisa el preset en Cloudinary.', 'red');
    }
  });

  async function uploadToCloudinary(file, presets){
    const urlBase = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    for (const preset of presets){
      try{
        const fd = new FormData();
        fd.append('file', file);
        fd.append('upload_preset', preset);
       

        const res = await fetch(urlBase, { method:'POST', body: fd });
        const data = await res.json();

        if (res.ok && data.secure_url) {
          return { ok:true, url:data.secure_url, preset };
        } else {
          // Si Cloudinary devuelve error, seguimos al siguiente preset
          console.warn(`Falló preset "${preset}"`, data);
        }
      } catch (err) {
        console.warn(`Error preset "${preset}"`, err);
      }
    }
    return { ok:false, message:'No se pudo subir. Verifica que el upload preset sea UNSIGNED y exista.', error:true };
  }

  function setStatus(text, color){
    if (!profileStatus) return;
    profileStatus.textContent = text;
    profileStatus.style.color = color || '';
  }

  // Guardar perfil
  editSellerForm?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const updates = {
      username:         fUsername.value.trim(),
      phone:            fPhone.value.trim(),
      whatsapp:         fWhatsapp.value.trim(),
      facebook:         fFacebook.value.trim(),
      instagram:        fInstagram.value.trim(),
    };
    if (profileUrlHidden.value) updates.photoUrl = profileUrlHidden.value;

    try{
      await db.collection('users').doc(sellerId).update(updates);
      alert('Perfil actualizado');
      closeModal(editSellerProfileModal);
    }catch(err){
      console.error(err);
      alert('No se pudo actualizar el perfil');
    }
  });

  detailedRatingsList.addEventListener('click', e => {
    if (e.target.classList.contains('edit-rating-btn')) {
      const ratingId = e.target.dataset.ratingId;
      openEditRatingModal(ratingId);
    }
  });

  function openEditRatingModal(ratingId) {
    db.collection('ratings').doc(ratingId).get().then(doc => {
      if (doc.exists) {
        const rating = doc.data();
        editRatingId.value = doc.id;
        editRatingValue.value = rating.stars;
        editRatingComment.value = rating.comment;
        
        editRatingStars.forEach(s => {
          s.classList.toggle('filled', s.getAttribute('data-value') <= rating.stars);
        });

        openModal(editRatingModal);
      }
    });
  }

  editRatingForm.addEventListener('submit', e => {
    e.preventDefault();
    const ratingId = editRatingId.value;
    const newStars = parseInt(editRatingValue.value, 10);
    const newComment = editRatingComment.value.trim();

    if (!newStars) {
      alert('Por favor, selecciona una calificación de estrellas.');
      return;
    }

    db.collection('ratings').doc(ratingId).update({
      stars: newStars,
      comment: newComment,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      alert('Calificación actualizada con éxito.');
      closeModal(editRatingModal);
    }).catch(error => {
      console.error('Error al actualizar la calificación: ', error);
      alert('Hubo un error al actualizar la calificación.');
    });
  });

  closeEditRatingBtn.addEventListener('click', () => closeModal(editRatingModal));

  if (editRatingStars) {
    editRatingStars.forEach(star => {
      star.addEventListener('mouseover', () => {
        const value = star.getAttribute('data-value');
        editRatingStars.forEach(s => {
          s.classList.toggle('hovered', s.getAttribute('data-value') <= value);
        });
      });

      star.addEventListener('mouseout', () => {
        editRatingStars.forEach(s => s.classList.remove('hovered'));
      });

      star.addEventListener('click', () => {
        const value = star.getAttribute('data-value');
        editRatingValue.value = value;
        editRatingStars.forEach(s => {
          s.classList.toggle('filled', s.getAttribute('data-value') <= value);
        });
      });
    });
  }
});
