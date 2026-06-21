  (() => {
    let _0x7a8d = [];
    let _0x5d4c = null;
    let _0xcatSub = '일반';
    let _0xgenSub = '판매';
    let _0xoilSub = '중앙회';
    let _0xSupplier = null; // [신규] 공급자 선택 상태 (미선택 시 null)

    // [신규] 공급자 정보 — 동아아세아농기계 등록번호/대표자/주소는 실제 사업자정보로 교체 필요
    const SUPPLIER_INFO = {
      naepo: { name: '내포농기계', regNo: '305-01-51599', ceo: '이 상 재', addr: '충남 홍성군 구항면 구항길 264번길 22', bizType: '도,소매', bizItem: '농기계' },
      donga: { name: '동아아세아농기계', regNo: '등록번호 입력필요', ceo: '대표자 입력필요', addr: '사업장주소 입력필요', bizType: '도,소매', bizItem: '농기계' }
    };
    
    let currentPage = 1;
    let _0xMatchedCache = [];
    const itemsPerPage = 10;

    // ============================================================
    // [신규] 백엔드 API 연동 — 더 이상 브라우저(localStorage)에만 저장하지 않고
    // 클라우드 서버에 저장/조회합니다. 아래 주소를 본인 Render 서버 주소로 맞춰두세요.
    // ============================================================
    const API_BASE = 'https://naepo-back.onrender.com';
    const TOKEN_KEY = 'npo_session_token';

    function getToken() { return sessionStorage.getItem(TOKEN_KEY); }
    function setToken(t) { sessionStorage.setItem(TOKEN_KEY, t); }
    function clearToken() { sessionStorage.removeItem(TOKEN_KEY); }

    // 인증 헤더를 자동으로 붙여주는 API 호출 헬퍼. 401(세션 만료) 발생 시 자동으로 로그인 화면으로 돌려보냄.
    async function apiFetch(path, options) {
      options = options || {};
      const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
      const token = getToken();
      if (token) headers['Authorization'] = 'Bearer ' + token;
      let res;
      try {
        res = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
      } catch (e) {
        throw new Error('서버에 연결할 수 없습니다. 인터넷 연결 또는 서버 상태를 확인해주세요.');
      }
      if (res.status === 401) {
        clearToken();
        document.getElementById('main-content').classList.remove('visible');
        document.getElementById('auth-layer').classList.remove('hidden');
        prettyAlert('세션 만료', '로그인이 만료되었습니다. 비밀번호를 다시 입력해주세요.');
        throw new Error('인증이 만료되었습니다.');
      }
      let data = null;
      try { data = await res.json(); } catch (e) { /* 본문 없음 */ }
      if (!res.ok) {
        throw new Error((data && data.error) || ('서버 오류가 발생했습니다. (' + res.status + ')'));
      }
      return data;
    }

    // 서버에서 전체 거래명세 목록을 가져와 _0x7a8d 배열을 채움
    async function _0x99aa_load() {
      try {
        const list = await apiFetch('/api/records');
        _0x7a8d = Array.isArray(list) ? list : [];
      } catch (e) {
        _0x7a8d = [];
        prettyAlert('불러오기 실패', e.message || '거래내역을 불러오는 중 오류가 발생했습니다.');
      }
    }

    // 디자인 모달 (Alert & Confirm 완벽 대체)
    function showPrettyModal(title, text, type, onConfirm, onCancel) {
      const container = document.getElementById('pretty-modal-container');
      const iconSlot = document.getElementById('pm-icon-slot');
      const titleSlot = document.getElementById('pm-title-slot');
      const textSlot = document.getElementById('pm-text-slot');
      const btnsSlot = document.getElementById('pm-btns-slot');
      
      titleSlot.textContent = title;
      textSlot.textContent = text;
      
      if (type === 'warn') {
        iconSlot.innerHTML = '<i class="fa-solid fa-triangle-exclamation pm-icon warn"></i>';
      } else {
        iconSlot.innerHTML = '<i class="fa-solid fa-circle-check pm-icon info"></i>';
      }
      
      btnsSlot.innerHTML = '';
      if (onCancel) {
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'pm-btn pm-btn-cancel';
        cancelBtn.textContent = '취소';
        cancelBtn.addEventListener('click', () => {
          container.classList.remove('show');
          onCancel();
        });
        btnsSlot.appendChild(cancelBtn);
      }
      
      const okBtn = document.createElement('button');
      okBtn.className = 'pm-btn pm-btn-ok';
      okBtn.textContent = '확인';
      okBtn.addEventListener('click', () => {
        container.classList.remove('show');
        if (onConfirm) onConfirm();
      });
      btnsSlot.appendChild(okBtn);
      
      container.classList.add('show');
    }

    function prettyAlert(title, text, onConfirm) {
      showPrettyModal(title, text, 'info', onConfirm, null);
    }
    function prettyConfirm(title, text, onConfirm, onCancel) {
      showPrettyModal(title, text, 'warn', onConfirm, onCancel);
    }

    // [수정사항 1] 날짜 기본값 세팅 (오늘 날짜)
    function setTodayDate() {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      document.getElementById('f-date').value = `${yyyy}-${mm}-${dd}`;
    }

    // [수정사항 2] 초기 페이지 진입 및 리셋 루틴 시 품목 연동 슬롯 1개 상시 자동 생성 대기
    window.addEventListener('DOMContentLoaded', () => {
      setTodayDate();
      createNewItemRow();
      _0xTryAutoLogin();
    });

    // [신규] 새로고침해도 같은 브라우저 탭 안에서는 다시 로그인하지 않도록, 기존 세션 토큰이 유효한지 확인
    async function _0xTryAutoLogin() {
      const token = getToken();
      if (!token) return;
      try {
        const list = await apiFetch('/api/records');
        _0x7a8d = Array.isArray(list) ? list : [];
        document.getElementById('auth-layer').classList.add('hidden');
        document.getElementById('main-content').classList.add('visible');
        _0x88ff();
      } catch (e) {
        clearToken();
      }
    }

    // 🔓 Web Crypto API 의존성 제거됨 — 이제 비밀번호 검증/암호화는 전부 서버에서 처리합니다.

    // 폼 동적 추가 로직
    function createNewItemRow() {
      const root = document.getElementById('items-builder-root');
      const idx = root.querySelectorAll('.item-row-card').length + 1;
      const card = document.createElement('div');
      card.className = 'item-row-card';
      // [기존 반영사항 6] 품목명 옆 규격(사양) 입력 칸 활성화 보장
      card.innerHTML = `
        <div class="item-row-header">
          <span class="item-row-title"><i class="fa-solid fa-list-ol"></i> 품목 연동 슬롯 #${idx}</span>
          <button class="btn btn-danger btn-sm btn-remove-item-row" type="button" style="padding: 2px 8px; font-size:11px;"><i class="fa-solid fa-trash-can"></i> 삭제</button>
        </div>
        <div class="g4">
          <div class="field"><label>명세 품목명 <span class="req">*</span></label><input type="text" class="p-item" placeholder="예: 트랙터 필터" maxlength="100"/></div>
          <div class="field"><label>규격 사양</label><input type="text" class="p-spec" placeholder="예: 100*50 / 15W-40" maxlength="50"/></div>
          <div class="field"><label>수량 <span class="req">*</span></label><input type="number" class="p-qty" value="1" min="0" step="any"/></div>
          <div class="field"><label>단가 (원) <span class="req">*</span></label><input type="number" class="p-price" value="0" min="0"/></div>
          <div class="field">
            <label>공급가액 & 세액</label>
            <div style="display:flex; gap:4px; align-items:center;">
              <input type="number" class="p-amount" placeholder="공급가액" style="flex:1; font-size:12px; padding:10px 6px;"/>
              <input type="number" class="p-tax" placeholder="세액" style="max-width:70px; font-size:12px; padding:10px 4px;"/>
              <label style="font-size:11px; font-weight:600; display:flex; align-items:center; gap:2px; white-space:nowrap; cursor:pointer;"><input type="checkbox" class="p-is-taxfree" style="accent-color:#047857; width:14px; height:14px;"/>과세</label>
            </div>
          </div>
        </div>
      `;
      root.appendChild(card);
      _0x11bb_bindRowEvents(card);
      _0x22bb_calcAll();
    }

    function _0x11bb_bindRowEvents(card) {
      const qtyIn = card.querySelector('.p-qty');
      const priceIn = card.querySelector('.p-price');
      const amtIn = card.querySelector('.p-amount');
      const taxIn = card.querySelector('.p-tax');
      const tfChk = card.querySelector('.p-is-taxfree');
      
      const calcRow = () => {
        const qty = parseFloat(qtyIn.value) || 0;
        const price = parseFloat(priceIn.value) || 0;
        const total = qty * price;
        
        if(tfChk.checked) {
          amtIn.value = Math.round(total / 1.1);
          taxIn.value = Math.round(total) - Math.round(total / 1.1);
        } else {
          amtIn.value = Math.round(total);
          taxIn.value = 0;
        }
        _0x22bb_calcAll();
      };
      
      qtyIn.addEventListener('input', calcRow);
      priceIn.addEventListener('input', calcRow);
      tfChk.addEventListener('change', calcRow);
      
      amtIn.addEventListener('input', () => { _0x22bb_calcAll(); });
      taxIn.addEventListener('input', () => { _0x22bb_calcAll(); });
      
      card.querySelector('.btn-remove-item-row').addEventListener('click', () => {
        card.remove();
        _0x22bb_calcAll();
      });
    }

    function _0x22bb_calcAll() {
      const cards = document.querySelectorAll('.item-row-card');
      let aggregatedTotal = 0;
      cards.forEach(c => {
        const amt = parseFloat(c.querySelector('.p-amount').value) || 0;
        const tax = parseFloat(c.querySelector('.p-tax').value) || 0;
        aggregatedTotal += (amt + tax);
      });
      
      const preview = document.getElementById('f-preview');
      if(cards.length > 0) {
        preview.style.display = 'block';
        document.getElementById('f-total').textContent = aggregatedTotal.toLocaleString();
      } else {
        preview.style.display = 'none';
      }
    }

    // [기존 반영사항 7] 저장하기 혹은 양식 초기화 핸들러 트리거 시 양식 완전 리셋 및 1슬롯 대기 매핑
    function _0x33dd() {
      ['f-author', 'f-company', 'f-name', 'f-region'].forEach(id => {
        document.getElementById(id).value = '';
      });
      ['e-date', 'e-name', 'e-region', 'e-isoil'].forEach(id => {
        document.getElementById(id).textContent = '';
      });
      
      setTodayDate();
      
      document.getElementById('f-isoil').checked = false;
      document.getElementById('oil-subs').style.display = 'none';
      
      const root = document.getElementById('items-builder-root');
      root.innerHTML = '';
      
      _0x5d4c = null;
      document.getElementById('live-preview-space').classList.remove('show');
      document.getElementById('premium-injected-frame').innerHTML = '';
      
      createNewItemRow();
    }

    async function _0x44cc() {
      // [신규] 공급자 미선택 시 저장 차단 + 경고창
      if (!_0xSupplier || !SUPPLIER_INFO[_0xSupplier]) {
        document.getElementById('e-supplier').textContent = '공급자를 선택해주세요.';
        prettyAlert('공급자 미선택', '거래명세서를 저장하려면 먼저 공급자(내포농기계 / 동아아세아농기계)를 선택해야 합니다.');
        return;
      }

      const fDate = document.getElementById('f-date');
      let valid = true;
      if(!fDate.value) {
        document.getElementById('e-date').textContent = '작성일자는 필수 항목입니다.';
        valid = false;
      } else {
        document.getElementById('e-date').textContent = '';
      }
      
      const fIsOil = document.getElementById('f-isoil');
      if(fIsOil.checked && (_0xcatSub === '일반')) {
        document.getElementById('e-isoil').textContent = '급유기 분할 옵션은 [계통출하] 또는 [자체조달] 분류에서만 결합 적용 가능합니다.';
        valid = false;
      } else {
        document.getElementById('e-isoil').textContent = '';
      }
      
      const rowElements = document.querySelectorAll('.item-row-card');
      if(rowElements.length === 0) {
        prettyAlert('저장 실패', '명세서에 등록된 품목 내역이 비어 있습니다.');
        return;
      }
      
      let itemsList = [];
      let aggregatedAmount = 0;
      let aggregatedTax = 0;
      let checkItemsValid = true;
      
      rowElements.forEach(row => {
        const itemVal = row.querySelector('.p-item').value.trim();
        const specVal = row.querySelector('.p-spec').value.trim();
        const qtyVal = parseFloat(row.querySelector('.p-qty').value) || 0;
        const priceVal = parseFloat(row.querySelector('.p-price').value) || 0;
        const amtVal = parseFloat(row.querySelector('.p-amount').value) || 0;
        const taxVal = parseFloat(row.querySelector('.p-tax').value) || 0;
        
        if(!itemVal) {
          row.querySelector('.p-item').classList.add('bad');
          checkItemsValid = false;
        } else {
          row.querySelector('.p-item').classList.remove('bad');
        }
        
        itemsList.push({ 
          item: itemVal, 
          spec: specVal || '-', 
          qty: qtyVal, 
          price: priceVal, 
          amount: amtVal, 
          tax: taxVal 
        });
        aggregatedAmount += amtVal;
        aggregatedTax += taxVal;
      });
      
      if(!checkItemsValid) {
        _0x55bb('필수 품목명 사양 항목이 누락되었습니다.', 'err');
        return;
      }
      if(!valid) return;
      
      let computedPart = _0xcatSub;
      if(_0xcatSub === '일반') {
        computedPart = `일반 [${_0xgenSub}]`;
      }
      if(fIsOil.checked) {
        computedPart += ` · 유류 [${_0xoilSub}]`;
      }
      
      const record = {
        id: generateUniqueId(),
        date: fDate.value,
        author: document.getElementById('f-author').value.trim() || '현장기사',
        supplier: _0xSupplier,
        company: document.getElementById('f-company').value.trim() || '-',
        name: document.getElementById('f-name').value.trim() || '-',
        region: document.getElementById('f-region').value.trim() || '미지정',
        cat: _0xcatSub,
        part: computedPart,
        note: itemsList[0].item + (itemsList.length > 1 ? ` 외 ${itemsList.length - 1}건` : ''),
        amount: aggregatedAmount,
        tax: aggregatedTax,
        items: itemsList
      };
      
      try {
        await apiFetch('/api/records', { method: 'POST', body: JSON.stringify(record) });
      } catch (e) {
        prettyAlert('저장 실패', e.message || '서버에 저장하는 중 오류가 발생했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.');
        return;
      }
      _0x7a8d.unshift(record);

      // 자동 초기화 호출
      prettyAlert('저장 완료', '거래 명세 내역이 서버에 저장되고, 작성 화면이 초기화되었습니다.', () => {
        _0x33dd();
        currentPage = 1;
        _0x88ff();
      });
    }

    // [버그 수정] 저장 시 호출되던 generateUniqueId 함수가 정의되어 있지 않아
    // ReferenceError로 저장 로직 전체가 중단되던 문제 해결
    function generateUniqueId() {
      return 'rec_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
    }

    function _0x55bb(txt, type) {
      const m = document.getElementById('msg');
      m.className = 'msg show ' + (type === 'ok' ? 'ok' : 'err');
      m.innerHTML = (type === 'ok' ? '<i class="fa-solid fa-circle-check"></i> ' : '<i class="fa-solid fa-circle-exclamation"></i> ') + txt;
      setTimeout(() => { m.classList.remove('show'); }, 4000);
    }

    function _0x55aa(cat) {
      _0xcatSub = cat;
      document.querySelectorAll('#cat-pills .pill').forEach(b => {
        if(b.getAttribute('data-cat') === cat) b.classList.add('g');
        else b.classList.remove('g');
      });
      const gBox = document.getElementById('gen-subs');
      if(cat === '\uC77C\uBC18') {
        gBox.style.display = 'block';
        // [\uC218\uC815\uC0AC\uD56D] \uC77C\uBC18\uAC70\uB798\uB85C \uC804\uD658 \uC2DC \uAE09\uC720\uAE30 \uBD84\uD560 \uCCB4\uD06C\uBC15\uC2A4 \uAC15\uC81C \uD574\uC81C
        const fIsOil = document.getElementById('f-isoil');
        if(fIsOil.checked) {
          fIsOil.checked = false;
          document.getElementById('oil-subs').style.display = 'none';
        }
      }
      else gBox.style.display = 'none';
    }

    // [신규] 공급자 선택 핸들러 — 명세서/엑셀에 반영될 공급자 정보 결정
    function _0xSelectSupplier(key) {
      _0xSupplier = key;
      document.querySelectorAll('#supplier-pills .pill').forEach(b => {
        if (b.getAttribute('data-supplier') === key) b.classList.add('g');
        else b.classList.remove('g');
      });
      const info = SUPPLIER_INFO[key];
      document.getElementById('supplier-bar-text').textContent =
        `공급자 정보: ${info.name} (${info.regNo}) · 대표 ${info.ceo} · ${info.addr}`;
      document.getElementById('e-supplier').textContent = '';
    }

    function _0x66bb(oil) {
      _0xoilSub = oil;
      document.querySelectorAll('#oil-pills .pill').forEach(b => {
        if(b.getAttribute('data-oil') === oil) b.classList.add('g');
        else b.classList.remove('g');
      });
    }

    // [수정사항 5] 분류파트로 키워드 조회 조작이 가능하도록 원장 필터링 확장
    function _0x88ff() {
      const q = document.getElementById('fl-search').value.toLowerCase().trim();
      const r = document.getElementById('fl-region').value.trim();
      const sDate = document.getElementById('fl-sdate').value;
      const eDate = document.getElementById('fl-edate').value;
      
      const matched = _0x7a8d.filter(item => {
        if(r && item.region !== r) return false;
        if(sDate && item.date < sDate) return false;
        if(eDate && item.date > eDate) return false;
        if(q) {
          const m1 = item.company.toLowerCase().includes(q);
          const m2 = item.name.toLowerCase().includes(q);
          const m3 = item.note.toLowerCase().includes(q);
          const m4 = item.author.toLowerCase().includes(q);
          const m5 = item.part.toLowerCase().includes(q); // 분류파트 필터링 결합 추가
          if(!m1 && !m2 && !m3 && !m4 && !m5) return false;
        }
        return true;
      });
      
      const body = document.getElementById('list-body');
      body.innerHTML = '';
      const totalCount = matched.length;
      _0xMatchedCache = matched;
      // [수정사항] \uD398\uC774\uC9C0 \uC774\uB3D9/\uC7AC\uC870\uD68C \uC2DC \uC804\uCCB4\uC120\uD0DD \uCCB4\uD06C\uBC15\uC2A4 \uAC15\uC81C \uD574\uC81C
      const chkAllEl = document.getElementById('chk-all');
      if (chkAllEl) chkAllEl.checked = false;
      _0xRenderSumText();
      
      if(totalCount === 0) {
        body.innerHTML = `<tr><td colspan="10" class="empty-td"><i class="fa-solid fa-folder-open" style="display:block; font-size:32px; margin-bottom:10px; color:#cbd5e1;"></i>조건에 부합하는 거래명세 내역 레코드가 존재하지 않습니다.</td></tr>`;
        document.getElementById('pagination-root').innerHTML = '';
        return;
      }
      
      const totalPages = Math.ceil(totalCount / itemsPerPage);
      if(currentPage > totalPages) currentPage = totalPages || 1;
      
      const startIndex = (currentPage - 1) * itemsPerPage;
      const pagedItems = matched.slice(startIndex, startIndex + itemsPerPage);
      
      pagedItems.forEach(item => {
        const tr = document.createElement('tr');
        // [수정사항 5] 관리 액션 내부에 독립 실행용 '인쇄' 버튼 확충 레이아웃 바인딩
        tr.innerHTML = `
          <td><input type="checkbox" class="chk-row" data-id="${item.id}" style="accent-color:#047857; cursor:pointer; width:15px; height:15px;"/></td>
          <td>${item.date}</td>
          <td>${item.author}</td>
          <td><strong>${item.name}</strong>${item.company !== '-' ? ' <span style="font-size:10.5px;color:#64748b">('+item.company+')</span>':''}</td>
          <td><span class="badge bn">${item.region}</span></td>
          <td><span class="badge bo">${item.part}</span></td>
          <td style="font-weight:600; text-align:left;" title="${item.note}">${item.note}</td>
          <td class="tr">${item.amount.toLocaleString()}</td>
          <td class="tr">${item.tax.toLocaleString()}</td>
          <td>
            <div class="ibtns">
              <button class="ibtn btn-view-direct" data-id="${item.id}"><i class="fa-solid fa-magnifying-glass"></i> 보기</button>
              <button class="ibtn btn-print-direct" data-id="${item.id}" style="color:#0284c7;"><i class="fa-solid fa-print"></i> 인쇄</button>
              <button class="ibtn btn-excel-direct" data-id="${item.id}" style="color:#047857;"><i class="fa-solid fa-file-excel"></i> 엑셀</button>
              <button class="ibtn d btn-delete-direct" data-id="${item.id}"><i class="fa-solid fa-trash"></i> 삭제</button>
            </div>
          </td>
        `;
        body.appendChild(tr);
      });
      
      _0x44ee_renderPagination(totalPages);
      _0x66ff_bindListActions();
    }

    // [수정사항] \uCCB4\uD06C\uBC15\uC2A4 \uC120\uD0DD \uC2DC \uD574\uB2F9 \uD56D\uBAA9\uB9CC\uC758 \uACF5\uAE09\uAC00\uC561/\uC138\uC561 \uD569\uC0B0 \uD45C\uC2DC
    function _0xRenderSumText() {
      const checkedBoxes = document.querySelectorAll('.chk-row:checked');
      const sumTextEl = document.getElementById('sum-text');
      if (checkedBoxes.length > 0) {
        let selAmt = 0, selTax = 0;
        checkedBoxes.forEach(cb => {
          const id = cb.getAttribute('data-id');
          const r = _0x7a8d.find(x => x.id === id);
          if (r) { selAmt += r.amount; selTax += r.tax; }
        });
        sumTextEl.innerHTML = `\uC120\uD0DD\uB41C \uD56D\uBAA9: <strong class="gn">${checkedBoxes.length}</strong>\uAC74 (\uACF5\uAE09\uAC00\uC561: <strong>${selAmt.toLocaleString()}</strong>\uC6D0 \u00B7 \uC138\uC561: <strong>${selTax.toLocaleString()}</strong>\uC6D0)`;
      } else {
        const matched = _0xMatchedCache;
        sumTextEl.innerHTML = `\uC870\uD68C \uD544\uD130 \uB370\uC774\uD130: <strong class="gn">${matched.length}</strong>\uAC74 (\uACF5\uAE09\uAC00\uC561: <strong>${matched.reduce((a,c)=>a+c.amount,0).toLocaleString()}</strong>\uC6D0 \u00B7 \uC138\uC561: <strong>${matched.reduce((a,c)=>a+c.tax,0).toLocaleString()}</strong>\uC6D0)`;
      }
    }

    function _0x44ee_renderPagination(totalPages) {
      const root = document.getElementById('pagination-root');
      root.innerHTML = '';
      if(totalPages <= 1) return;
      
      const prevBtn = document.createElement('button');
      prevBtn.className = 'page-num-btn';
      prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
      prevBtn.disabled = (currentPage === 1);
      prevBtn.addEventListener('click', () => { if(currentPage > 1) { currentPage--; _0x88ff(); } });
      root.appendChild(prevBtn);
      
      for(let i=1; i<=totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = 'page-num-btn' + (i === currentPage ? ' active' : '');
        btn.textContent = i;
        btn.addEventListener('click', () => { currentPage = i; _0x88ff(); });
        root.appendChild(btn);
      }
      
      const nextBtn = document.createElement('button');
      nextBtn.className = 'page-num-btn';
      nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
      nextBtn.disabled = (currentPage === totalPages);
      nextBtn.addEventListener('click', () => { if(currentPage < totalPages) { currentPage++; _0x88ff(); } });
      root.appendChild(nextBtn);
    }

    // 숫자 → 한글 금액 변환
    function numToKorean(n) {
      if (!n || n === 0) return '\uC601';
      var d = ['','\uC77C','\uC774','\uC0BC','\uC0AC','\uC624','\uC721','\uCE60','\uD314','\uAD6C'];
      var s = ['','\uC2ED','\uBC31','\uCC9C'];
      var b = ['','\uB9CC','\uC5B5','\uC870'];
      var result = '';
      var gi = 0;
      var num = Math.abs(Math.floor(n));
      while (num > 0) {
        var chunk = num % 10000;
        if (chunk > 0) {
          var cs = '';
          for (var p = 0; p < 4; p++) {
            var digit = Math.floor(chunk / Math.pow(10, p)) % 10;
            if (digit > 0) {
              if (p === 0) { cs = d[digit] + cs; }
              else { cs = (digit === 1 ? '' : d[digit]) + s[p] + cs; }
            }
          }
          result = cs + b[gi] + result;
        }
        num = Math.floor(num / 10000);
        gi++;
      }
      return result;
    }

    // [수정사항 3] 내포농기계 거래명세서 — 분리 테이블 방식 (완벽 병합·가독성)
    var generatePremiumHTMLMarkup = function(d) {
      var totalAmt = d.amount;
      var totalTax = d.tax;
      var grandTotal = totalAmt + totalTax;
      var pp = d.date.split('-');
      var yy = pp[0], mm = parseInt(pp[1],10), dd = parseInt(pp[2],10);
      var nm = (d.name && d.name !== '-') ? d.name : '\uC190\uB2D8';
      var co = (d.company && d.company !== '-') ? d.company : '';
      var rg = (d.region && d.region !== '\uBBF8\uC9C0\uC815') ? d.region : '';
      var pt = d.part || '';
      var RC = Math.max(5, d.items.length);
      var krAmt = '\uAE08 ' + numToKorean(grandTotal) + '\uC6D0\uC815';
      var sup = SUPPLIER_INFO[d.supplier] || SUPPLIER_INFO.naepo;

      function sheet(cls, copyLabel) {
        // 품목 행
        var irows = '';
        for (var i = 0; i < RC; i++) {
          var it = d.items[i];
          var dc = (i === 0) ? (mm + '/' + dd) : '';
          if (it) {
            var sp = (it.spec && it.spec !== '-') ? it.spec : '';
            irows +=
              '<tr>' +
              '<td class="tfs-ic">' + dc + '</td>' +
              '<td class="tfs-il">' + it.item + '</td>' +
              '<td class="tfs-ic">' + sp + '</td>' +
              '<td class="tfs-ic">' + it.qty + '</td>' +
              '<td class="tfs-ir">' + it.price.toLocaleString() + '</td>' +
              '<td class="tfs-ir">' + it.amount.toLocaleString() + '</td>' +
              '<td class="tfs-ir">' + it.tax.toLocaleString() + '</td>' +
              '<td class="tfs-ic"></td></tr>';
          } else {
            irows += '<tr><td class="tfs-ic">' + dc + '</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>';
          }
        }

        return '<div class="tfs ' + cls + '">' +

          /* 타이틀 */
          '<div class="tfs-title">' +
            '<span class="tfs-name">' + sup.name + ' \uAC70 \uB798 \uBA85 \uC138 \uC11C</span>' +
            '<span class="tfs-sub">(' + copyLabel + ')</span>' +
          '</div>' +

          /* ── 공급자·공급받는자 정보 ── */
          '<table>' +
            '<colgroup>' +
              '<col style="width:22px"/>' +
              '<col style="width:64px"/>' +
              '<col/>' +
              '<col style="width:46px"/>' +
              '<col/>' +
              '<col style="width:22px"/>' +
              '<col style="width:64px"/>' +
              '<col/>' +
              '<col style="width:46px"/>' +
              '<col/>' +
            '</colgroup>' +
            '<tr>' +
              '<td class="tfs-sl" rowspan="4">\uACF5<br/>\uAE09<br/>\uC790</td>' +
              '<td class="tfs-k">\uB4F1\uB85D\uBC88\uD638</td>' +
              '<td class="tfs-vb" colspan="3" style="letter-spacing:2px;">' + sup.regNo + '</td>' +
              '<td class="tfs-sl" rowspan="4">\uACF5<br/>\uAE09<br/>\uBC1B<br/>\uB294<br/>\uC790</td>' +
              '<td class="tfs-k">\uB4F1\uB85D\uBC88\uD638</td>' +
              '<td colspan="3"></td>' +
            '</tr>' +
            '<tr>' +
              '<td class="tfs-k">\uC0C1&nbsp;\uD638<small>(\uBC95\uC778\uBA85)</small></td>' +
              '<td class="tfs-vb">' + sup.name + '</td>' +
              '<td class="tfs-k">\uC131\uBA85</td>' +
              '<td class="tfs-vb">' + sup.ceo + '</td>' +
              '<td class="tfs-k">\uC0C1&nbsp;\uD638<small>(\uBC95\uC778\uBA85)</small></td>' +
              '<td class="tfs-v">' + co + '</td>' +
              '<td class="tfs-k">\uC131\uBA85</td>' +
              '<td class="tfs-vb">' + nm + '</td>' +
            '</tr>' +
            '<tr>' +
              '<td class="tfs-k">\uC0AC\uC5C5\uC7A5<br/>\uC8FC&nbsp;\uC18C</td>' +
              '<td class="tfs-v" colspan="3" style="font-size:9px;">' + sup.addr + '</td>' +
              '<td class="tfs-k">\uC0AC\uC5C5\uC7A5<br/>\uC8FC&nbsp;\uC18C</td>' +
              '<td class="tfs-v" colspan="3"></td>' +
            '</tr>' +
            '<tr>' +
              '<td class="tfs-k">\uC5C5&nbsp;\uD0DC</td>' +
              '<td class="tfs-v">' + sup.bizType + '</td>' +
              '<td class="tfs-k">\uC885\uBAA9</td>' +
              '<td class="tfs-v">' + sup.bizItem + '</td>' +
              '<td class="tfs-k">\uC5C5&nbsp;\uD0DC</td>' +
              '<td class="tfs-v"></td>' +
              '<td class="tfs-k">\uC9C0&nbsp;\uC5ED</td>' +
              '<td class="tfs-v">' + rg + '</td>' +
            '</tr>' +
          '</table>' +

          /* ── 작성년월일 + 요청사항 (\uBCD1\uD569\uD615 \uCEF4\uD329\uD2B8) ── */
          '<table>' +
            '<colgroup>' +
              '<col style="width:48px"/>' +
              '<col style="width:96px"/>' +
              '<col style="width:48px"/>' +
              '<col/>' +
            '</colgroup>' +
            '<tr>' +
              '<td class="tfs-mid-k">\uC791\uC131<br/>\uB144\uC6D4\uC77C</td>' +
              '<td class="tfs-mid-v">' + yy + '\uB144 ' + mm + '\uC6D4 ' + dd + '\uC77C</td>' +
              '<td class="tfs-mid-k">\uC694\uCCAD\uC0AC\uD56D</td>' +
              '<td class="tfs-mid-r">&nbsp;</td>' +
            '</tr>' +
          '</table>' +

          /* ── 품목 테이블 ── */
          '<table>' +
            '<colgroup>' +
              '<col style="width:8%"/>' +
              '<col style="width:24%"/>' +
              '<col style="width:10%"/>' +
              '<col style="width:7%"/>' +
              '<col style="width:13%"/>' +
              '<col style="width:16%"/>' +
              '<col style="width:12%"/>' +
              '<col style="width:10%"/>' +
            '</colgroup>' +
            '<tr>' +
              '<td class="tfs-ih">\uC6D4&nbsp;\uC77C</td>' +
              '<td class="tfs-ih">\uD488&nbsp;&nbsp;\uBAA9</td>' +
              '<td class="tfs-ih">\uADDC&nbsp;\uACA9</td>' +
              '<td class="tfs-ih">\uC218&nbsp;\uB7C9</td>' +
              '<td class="tfs-ih">\uB2E8&nbsp;\uAC00</td>' +
              '<td class="tfs-ih">\uACF5\uAE09\uAC00\uC561</td>' +
              '<td class="tfs-ih">\uC138&nbsp;\uC561</td>' +
              '<td class="tfs-ih">\uBE44&nbsp;\uACE0</td>' +
            '</tr>' +
            irows +
          '</table>' +

          /* ── 하단 합계 ── */
          '<table>' +
            '<colgroup>' +
              '<col style="width:14%"/>' +
              '<col style="width:14%"/>' +
              '<col style="width:14%"/>' +
              '<col style="width:14%"/>' +
              '<col style="width:14%"/>' +
              '<col style="width:30%"/>' +
            '</colgroup>' +
            '<tr>' +
              '<td class="tfs-fl">\uD569\uACC4\uAE08\uC561</td>' +
              '<td class="tfs-fl">\uD604&nbsp;&nbsp;\uAE08</td>' +
              '<td class="tfs-fl">\uBD84&nbsp;&nbsp;\uB958</td>' +
              '<td class="tfs-fl">\uC5B4&nbsp;&nbsp;\uC74C</td>' +
              '<td class="tfs-fl">\uC678\uC0C1\uBBF8\uC218\uAE08</td>' +
              '<td class="tfs-rc" rowspan="2">\uC704 \uAE08\uC561\uC744&nbsp;&nbsp;<b>\uC601\uC218</b>&nbsp;&nbsp;\uD568</td>' +
            '</tr>' +
            '<tr>' +
              '<td class="tfs-fv">' + grandTotal.toLocaleString() + '\uC6D0</td>' +
              '<td class="tfs-ic"></td>' +
              '<td class="tfs-ic" style="font-size:9px;">' + pt + '</td>' +
              '<td class="tfs-ic"></td>' +
              '<td class="tfs-ic"></td>' +
            '</tr>' +
          '</table>' +

          /* ── 하단 금액·용지 ── */
          '<div class="tfs-bottom">' +
            '<span class="tfs-amt">' + krAmt + '</span>' +
            '<span class="tfs-paper">182mm \u00D7 128mm \uC778\uC1C4\uC6A9\uC9C0</span>' +
          '</div>' +

        '</div>';
      }

      return '<div class="excel-frame">' +
        sheet('', '\uACF5\uAE09\uC790 \uBCF4\uAD00\uC6A9') +
        '<div class="excel-divider"><span>\u2702 \uC808\uCDE8\uC120 \u2702</span></div>' +
        sheet('bl', '\uACF5\uAE09\uBC1B\uB294\uC790 \uBCF4\uAD00\uC6A9') +
      '</div>';
    };

    function _0x66ff_bindListActions() {
      document.querySelectorAll('.btn-view-direct').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const record = _0x7a8d.find(x => x.id === id);
          if(record) {
            _0x5d4c = record;
            document.getElementById('premium-injected-frame').innerHTML = generatePremiumHTMLMarkup(record);
            document.getElementById('live-preview-space').classList.add('show');
            document.getElementById('live-preview-space').scrollIntoView({ behavior: 'smooth' });
          }
        });
      });

      // [수정사항 5] 관리액션 인쇄 액션 연동 물리 마운트
      document.querySelectorAll('.btn-print-direct').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const record = _0x7a8d.find(x => x.id === id);
          if(record) printDirectlyFromOverlay(record);
        });
      });
      
      document.querySelectorAll('.btn-delete-direct').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          prettyConfirm('데이터 삭제 경고', '선택한 명세서 내역을 서버에서 영구 삭제하시겠습니까?', async () => {
            try {
              await apiFetch('/api/records/' + encodeURIComponent(id), { method: 'DELETE' });
            } catch (e) {
              prettyAlert('삭제 실패', e.message || '서버에서 삭제하는 중 오류가 발생했습니다.');
              return;
            }
            _0x7a8d = _0x7a8d.filter(x => x.id !== id);
            _0x55bb('해당 명세 레코드가 서버에서 삭제되었습니다.', 'ok');
            _0x88ff();
            if(_0x5d4c && _0x5d4c.id === id) {
              _0x5d4c = null;
              document.getElementById('live-preview-space').classList.remove('show');
              document.getElementById('premium-injected-frame').innerHTML = '';
            }
          });
        });
      });
      
      document.querySelectorAll('.btn-excel-direct').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const record = _0x7a8d.find(x => x.id === id);
          if(record) {
            _0x5d4c = record;
            downloadLivePremiumExcel([record]);
          }
        });
      });
    }

    // [신규] 인쇄 직전 실제 렌더링 높이를 측정해서 A4 한 장에 정확히 맞도록 --pscale 변수로 글자/여백을 비례 축소
    function _0xFitPrintToOnePage() {
      const area = document.getElementById('print-target-area');
      if (!area || !area.querySelector('.excel-frame')) return;
      area.classList.add('pf-active');
      area.style.setProperty('--pscale', '1');
      void area.offsetHeight;
      // @page margin: 4mm 5mm → 세로 사용 가능 영역 = 297mm - 8mm
      const availableHeightPx = (297 - 8) * (96 / 25.4);
      let scale = 1;
      // 최대 3회 반복 보정 (테두리 두께 등 비선형 요소 보정을 위함)
      for (let i = 0; i < 3; i++) {
        const h = area.scrollHeight;
        if (h <= availableHeightPx) break;
        const ratio = availableHeightPx / h;
        scale = Math.max(0.5, scale * ratio * 0.985); // 0.985: 안전 여유분
        area.style.setProperty('--pscale', String(scale));
        void area.offsetHeight;
      }
    }
    function _0xResetPrintZoom() {
      const area = document.getElementById('print-target-area');
      if (area) { area.style.setProperty('--pscale', '1'); area.classList.remove('pf-active'); }
    }
    window.addEventListener('beforeprint', _0xFitPrintToOnePage);
    window.addEventListener('afterprint', _0xResetPrintZoom);

    function printDirectlyFromOverlay(record) {
      const area = document.getElementById('print-target-area');
      area.innerHTML = generatePremiumHTMLMarkup(record);
      _0x5d4c = record;
      document.getElementById('print-overlay').classList.add('show');
      // [수정사항] 관리 액션의 인쇄 버튼 클릭 시 오버레이를 띄운 직후 바로 인쇄 다이얼로그 호출
      setTimeout(() => { _0xFitPrintToOnePage(); window.print(); }, 150);
    }

    // 엑셀 데이터 생성 — 미리보기 HTML과 동일한 구조로 생성 (셀 병합 포함)
    function generateExcelDataWithMerges(recordsList) {
      var rows = [], merges = [], r = 0;
      recordsList.forEach(function(record) {
        var pp = record.date.split('-');
        var yy = pp[0], mm = parseInt(pp[1],10), dd = parseInt(pp[2],10);
        var nm = (record.name && record.name !== '-') ? record.name : '\uC190\uB2D8';
        var co = (record.company && record.company !== '-') ? record.company : '';
        var rg = (record.region && record.region !== '\uBBF8\uC9C0\uC815') ? record.region : '';
        var pt = record.part || '';
        var grandTotal = record.amount + record.tax;
        var RC = Math.max(5, record.items.length);
        var krAmt = '\uAE08 ' + numToKorean(grandTotal) + '\uC6D0\uC815';
        var sup = SUPPLIER_INFO[record.supplier] || SUPPLIER_INFO.naepo;
        ['\uACF5\uAE09\uC790 \uBCF4\uAD00\uC6A9','\uACF5\uAE09\uBC1B\uB294\uC790 \uBCF4\uAD00\uC6A9'].forEach(function(cl) {
          // \uD0C0\uC774\uD2C0
          rows.push([sup.name + ' \uAC70\uB798\uBA85\uC138\uC11C','','','','('+cl+')','','','']);
          merges.push({s:{r:r,c:0},e:{r:r,c:3}});merges.push({s:{r:r,c:4},e:{r:r,c:7}});r++;
          // \uB4F1\uB85D\uBC88\uD638
          var pr=r;
          rows.push(['\uACF5\uAE09\uC790','\uB4F1\uB85D\uBC88\uD638',sup.regNo,'','\uACF5\uAE09\uBC1B\uB294\uC790','\uB4F1\uB85D\uBC88\uD638','','']);
          merges.push({s:{r:r,c:0},e:{r:pr+3,c:0}});merges.push({s:{r:r,c:2},e:{r:r,c:3}});merges.push({s:{r:r,c:4},e:{r:pr+3,c:4}});merges.push({s:{r:r,c:6},e:{r:r,c:7}});r++;
          // \uC0C1\uD638/\uC131\uBA85
          rows.push(['','\uC0C1\uD638(\uBC95\uC778\uBA85)',sup.name,'\uC131\uBA85: '+sup.ceo,'','\uC0C1\uD638(\uBC95\uC778\uBA85)',co,'\uC131\uBA85: '+nm]);r++;
          // \uC0AC\uC5C5\uC7A5\uC8FC\uC18C
          rows.push(['','\uC0AC\uC5C5\uC7A5\uC8FC\uC18C',sup.addr,'','','\uC0AC\uC5C5\uC7A5\uC8FC\uC18C','','']);
          merges.push({s:{r:r,c:2},e:{r:r,c:3}});merges.push({s:{r:r,c:6},e:{r:r,c:7}});r++;
          // \uC5C5\uD0DC/\uC885\uBAA9 - \uC5C5\uD0DC/\uC9C0\uC5ED
          rows.push(['','\uC5C5\uD0DC',sup.bizType,'\uC885\uBAA9: '+sup.bizItem,'','\uC5C5\uD0DC','','\uC9C0\uC5ED: '+rg]);r++;
          // \uC791\uC131\uB144\uC6D4\uC77C + \uC694\uCCAD\uC0AC\uD56D (\uBCD1\uD569\uD615 \uCEF4\uD329\uD2B8)
          rows.push(['\uC791\uC131\uB144\uC6D4\uC77C', yy+'\uB144 '+mm+'\uC6D4 '+dd+'\uC77C', '\uC694\uCCAD\uC0AC\uD56D', '', '', '', '', '']);
          merges.push({s:{r:r,c:3},e:{r:r,c:7}});r++;
          // \uD488\uBAA9 \uD5E4\uB354
          rows.push(['\uC6D4/\uC77C','\uD488\uBAA9','\uADDC\uACA9','\uC218\uB7C9','\uB2E8\uAC00','\uACF5\uAE09\uAC00\uC561','\uC138\uC561','\uBE44\uACE0']);r++;
          // \uD488\uBAA9 \uB370\uC774\uD130
          for(var i=0;i<RC;i++){var it=record.items[i];var dc=(i===0)?(mm+'/'+dd):'';
            if(it){var sp=(it.spec&&it.spec!=='-')?it.spec:'';rows.push([dc,it.item,sp,it.qty,it.price,it.amount,it.tax,'']);}
            else{rows.push([dc,'','','','','','','']);}r++;}
          // \uD558\uB2E8 \uD569\uACC4
          rows.push(['\uD569\uACC4\uAE08\uC561','\uD604\uAE08','\uBD84\uB958','\uC5B4\uC74C','\uC678\uC0C1\uBBF8\uC218\uAE08','\uC704 \uAE08\uC561\uC744 \uC601\uC218 \uD568','','']);
          merges.push({s:{r:r,c:5},e:{r:r+1,c:7}});r++;
          rows.push([grandTotal,'',pt,'','','','','']);r++;
          // \uD55C\uAE00 \uAE08\uC561 + \uC6A9\uC9C0\uD06C\uAE30
          rows.push([krAmt,'','','','','','182mm\u00D7128mm','']);
          merges.push({s:{r:r,c:0},e:{r:r,c:4}});merges.push({s:{r:r,c:6},e:{r:r,c:7}});r++;
          rows.push(['','','','','','','','']);r++;
          if(cl==='\uACF5\uAE09\uC790 \uBCF4\uAD00\uC6A9'){
            rows.push(['\u2702 - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - \u2702','','','','','','','']);
            merges.push({s:{r:r,c:0},e:{r:r,c:7}});r++;
            rows.push(['','','','','','','','']);r++;
          }
        });
      });
      return {rows:rows,merges:merges};
    }

    function applyExcelPremiumStyles(ws, dataInfo) {
      if(!ws||typeof ws!=='object')return ws;
      var rows=dataInfo.rows;ws['!merges']=dataInfo.merges;
      var secs=[],ss=0,sc='red';
      for(var i=0;i<rows.length;i++){if(String(rows[i][0]||'').indexOf('\u2702')>=0){secs.push({s:ss,e:i-1,c:sc});ss=i+2;sc='blue';}}
      secs.push({s:ss,e:rows.length-1,c:sc});
      function gc(ri){for(var j=0;j<secs.length;j++){if(ri>=secs[j].s&&ri<=secs[j].e)return secs[j].c;}return'red';}
      var RD="B33A3A",BL="2C5F8A",LR="FDECEA",LB="EBF0F7",LG="F5F0EB";
      function bd(c){return{top:{style:"thin",color:{rgb:c}},bottom:{style:"thin",color:{rgb:c}},left:{style:"thin",color:{rgb:c}},right:{style:"thin",color:{rgb:c}}};}
      var KS=['\uB4F1\uB85D\uBC88\uD638','\uC0C1\uD638(\uBC95\uC778\uBA85)','\uC0AC\uC5C5\uC7A5\uC8FC\uC18C','\uC5C5\uD0DC','\uC791\uC131\uB144\uC6D4\uC77C','\uC694\uCCAD\uC0AC\uD56D','\uD604\uAE08','\uBD84\uB958','\uC5B4\uC74C','\uC678\uC0C1\uBBF8\uC218\uAE08'];
      var IH=['\uC6D4/\uC77C','\uD488\uBAA9','\uADDC\uACA9','\uC218\uB7C9','\uB2E8\uAC00','\uACF5\uAE09\uAC00\uC561','\uC138\uC561','\uBE44\uACE0'];
      for(var R=0;R<rows.length;R++){var cl=gc(R)==='red'?RD:BL;var lb=gc(R)==='red'?LR:LB;
        for(var C=0;C<8;C++){var cr=XLSX.utils.encode_cell({r:R,c:C});if(!ws[cr])ws[cr]={v:'',t:'s'};var cell=ws[cr];var v=String(cell.v||'');
          cell.s={font:{name:'\uB9D1\uC740 \uACE0\uB515',sz:8.5,color:{rgb:"222222"}},alignment:{vertical:"center",horizontal:"center",wrapText:true},border:bd(cl)};
          if(v.indexOf('\uAC70\uB798\uBA85\uC138\uC11C')>=0){cell.s.font={name:'\uB9D1\uC740 \uACE0\uB515',sz:13,bold:true,color:{rgb:cl}};}
          else if(v.indexOf('\uBCF4\uAD00\uC6A9')>=0){cell.s.font={name:'\uB9D1\uC740 \uACE0\uB515',sz:9.5,bold:true,color:{rgb:cl}};}
          else if(v==='\uACF5\uAE09\uC790'||v==='\uACF5\uAE09\uBC1B\uB294\uC790'){cell.s.fill={fgColor:{rgb:cl}};cell.s.font={name:'\uB9D1\uC740 \uACE0\uB515',sz:8.5,bold:true,color:{rgb:"FFFFFF"}};}
          else if(v==='\uD569\uACC4\uAE08\uC561'){cell.s.fill={fgColor:{rgb:lb}};cell.s.font={name:'\uB9D1\uC740 \uACE0\uB515',sz:8.5,bold:true,color:{rgb:cl}};}
          else if(v.indexOf('\uC704 \uAE08\uC561')>=0){cell.s.font={name:'\uB9D1\uC740 \uACE0\uB515',sz:9.5,bold:true,color:{rgb:"444444"}};}
          else if(v.indexOf('\uAE08 ')===0&&v.indexOf('\uC6D0\uC815')>0){cell.s.font={name:'\uB9D1\uC740 \uACE0\uB515',sz:8.5,bold:true,color:{rgb:cl}};cell.s.alignment.horizontal='left';}
          else if(KS.indexOf(v)>=0){cell.s.fill={fgColor:{rgb:LG}};cell.s.font={name:'\uB9D1\uC740 \uACE0\uB515',sz:8.5,bold:true,color:{rgb:"444444"}};}
          else if(IH.indexOf(v)>=0){cell.s.fill={fgColor:{rgb:lb}};cell.s.font={name:'\uB9D1\uC740 \uACE0\uB515',sz:8.5,bold:true,color:{rgb:cl}};}
          else if(v.indexOf('\u2702')>=0){cell.s.font={name:'\uB9D1\uC740 \uACE0\uB515',sz:8,color:{rgb:"AAAAAA"}};cell.s.border={};}
          else if(v.indexOf('\uC131\uBA85:')>=0||v.indexOf('\uC885\uBAA9:')>=0||v.indexOf('\uC9C0\uC5ED:')>=0){cell.s.font={name:'\uB9D1\uC740 \uACE0\uB515',sz:8.5,bold:true,color:{rgb:"222222"}};cell.s.alignment.horizontal='left';}
          else if(v.indexOf('\uB144 ')>=0&&v.indexOf('\uC6D4 ')>=0&&v.indexOf('\uC77C')>=0&&v.length<16){cell.s.font={name:'\uB9D1\uC740 \uACE0\uB515',sz:8,bold:true,color:{rgb:"222222"}};cell.s.alignment.horizontal='center';}
          if(typeof cell.v==='number'){cell.z='#,##0';cell.s.alignment.horizontal='right';}
        }
      }
      for(var R2=0;R2<rows.length;R2++){if(String(rows[R2][0])==='\uD569\uACC4\uAE08\uC561'&&R2+1<rows.length&&typeof rows[R2+1][0]==='number'){
        var c2=gc(R2)==='red'?RD:BL;var rf=XLSX.utils.encode_cell({r:R2+1,c:0});if(ws[rf]){ws[rf].s.font={name:'\uB9D1\uC740 \uACE0\uB515',sz:12,bold:true,color:{rgb:c2}};ws[rf].z='#,##0"\uC6D0"';}}}
      // \uC694\uCCAD\uC0AC\uD56D \uAC12 \uC140 \uC67C\uC815\uB82C
      for(var R3=0;R3<rows.length;R3++){if(String(rows[R3][2])==='\uC694\uCCAD\uC0AC\uD56D'){
        var rf3=XLSX.utils.encode_cell({r:R3,c:3});if(ws[rf3]){ws[rf3].s.alignment.horizontal='left';ws[rf3].s.font={name:'\uB9D1\uC740 \uACE0\uB515',sz:9,color:{rgb:"444444"}};}}}
      ws['!cols']=[{wch:10},{wch:13},{wch:16},{wch:14},{wch:9},{wch:13},{wch:9},{wch:14}];
      ws['!rows']=rows.map(function(row){var v=String(row[0]||'');if(v.indexOf('\uAC70\uB798')>=0)return{hpt:28,hpx:37,customHeight:true};if(v.indexOf('\u2702')>=0)return{hpt:12,hpx:16,customHeight:true};return{hpt:24,hpx:32,customHeight:true};});
      // 인쇄 설정 — 세로방향, 가로/세로 모두 1페이지에 강제 맞춤 (절대 2페이지로 넘어가지 않음)
      if (!ws['!pageSetup']) ws['!pageSetup'] = {};
      ws['!pageSetup'].orientation = 'portrait';
      ws['!pageSetup'].fitToWidth = 1;
      ws['!pageSetup'].fitToHeight = 1;
      ws['!pageSetup'].fitToPage = true;
      ws['!pageSetup'].paperSize = 9;
      ws['!margins'] = { left:0.15, right:0.15, top:0.2, bottom:0.2, header:0.1, footer:0.1 };
      return ws;
    }

    // [수정사항] \uC5D1\uC140 \uD30C\uC77C\uBA85/\uC2DC\uD2B8\uBA85 \uACF5\uD1B5 \uBE4C\uB354: \uB0B4\uD3EC\uB18D\uAE30\uACC4_\uC0C1\uD638\uC131\uBA85_\uC9C0\uC5ED_\uBD84\uB958\uD30C\uD2B8_\uD488\uBAA9
    function buildRecordLabel(record) {
      var sup = SUPPLIER_INFO[record.supplier] || SUPPLIER_INFO.naepo;
      var partyLabel = (record.company && record.company !== '-') ? record.company : record.name;
      var regionLabel = (record.region && record.region !== '\uBBF8\uC9C0\uC815') ? record.region : '\uC9C0\uC5ED\uBBF8\uC9C0\uC815';
      var partLabel = (record.part || '').replace(/[\[\]]/g, '').replace(/\s+/g, '');
      var itemLabel;
      if (record.items && record.items.length > 0) {
        itemLabel = record.items[0].item;
        if (record.items.length > 1) itemLabel += '\uC678' + (record.items.length - 1) + '\uAC74';
      } else {
        itemLabel = '\uD488\uBAA9\uC5C6\uC74C';
      }
      var label = sup.name + '_' + partyLabel + '_' + regionLabel + '_' + partLabel + '_' + itemLabel;
      label = label.replace(/[:\\/?*\[\]"]/g, '').replace(/\s+/g, '');
      return label;
    }

    function downloadLivePremiumExcel(recordsArray) {
      var targets = recordsArray || [_0x5d4c];
      if(!targets || targets.length === 0 || !targets[0]) {
        prettyAlert('\uC791\uC5C5 \uBD88\uAC00', '\uC120\uD0DD\uB418\uAC70\uB098 \uD65C\uC131\uD654\uB41C \uAC70\uB798\uBA85\uC138 \uB808\uCF54\uB4DC\uAC00 \uC874\uC7AC\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.');
        return;
      }
      var wb = XLSX.utils.book_new();
      wb.Workbook = wb.Workbook || {};
      wb.Workbook.Names = wb.Workbook.Names || [];
      // 각 레코드를 별도 시트로 생성
      targets.forEach(function(record, idx) {
        var dataInfo = generateExcelDataWithMerges([record]);
        var ws = XLSX.utils.aoa_to_sheet(dataInfo.rows);
        var finalWs = applyExcelPremiumStyles(ws, dataInfo);
        // 인쇄 영역·페이지 설정
        var lastRow = dataInfo.rows.length - 1;
        var lastRowNum = lastRow + 1;
        finalWs['!ref'] = 'A1:H' + lastRowNum;
        if (!finalWs['!pageSetup']) finalWs['!pageSetup'] = {};
        finalWs['!pageSetup'].orientation = 'portrait';
        finalWs['!pageSetup'].fitToWidth = 1;
        finalWs['!pageSetup'].fitToHeight = 1;
        finalWs['!pageSetup'].fitToPage = true;
        finalWs['!pageSetup'].paperSize = 9; // A4
        finalWs['!margins'] = { left:0.15, right:0.15, top:0.2, bottom:0.2, header:0.1, footer:0.1 };
        var sheetName = buildRecordLabel(record).substring(0, 31);
        if (targets.length > 1) sheetName = ((idx + 1) + '_' + sheetName).substring(0, 31);
        // [신규] 인쇄영역(Print Area)을 A1:H{마지막행} 전체로 명시적으로 지정 — 페이지 나누기 미리보기에서 일부 열/행이
        // 누락되어 잘려 보이던 문제의 근본 원인. 명시적으로 지정해야 Excel이 항상 전체 범위를 1페이지 맞춤 대상으로 인식함.
        wb.Workbook.Names.push({
          Sheet: idx,
          Name: '_xlnm.Print_Area',
          Ref: "'" + sheetName + "'!$A$1:$H$" + lastRowNum
        });
        XLSX.utils.book_append_sheet(wb, finalWs, sheetName);
      });
      var filename;
      if (targets.length === 1) filename = buildRecordLabel(targets[0]) + '.xlsx';
      else filename = '\uB0B4\uD3EC\uB18D\uAE30\uACC4_\uC120\uD0DD\uD56D\uBAA9_' + targets.length + '\uAC74.xlsx';
      XLSX.writeFile(wb, filename);
    }

    function _0xbbff() {
      document.getElementById('print-overlay').classList.remove('show');
      document.getElementById('pwd-overlay').classList.remove('show');
      document.getElementById('print-target-area').innerHTML = '';
      document.getElementById('pwd-err').textContent = '';
      document.getElementById('pw-old').value = '';
      document.getElementById('pw-new').value = '';
    }

    async function _0xeedd() {
      // [변경] 비밀번호는 이제 서버(Render 환경변수)에서 관리합니다. 앱 내 변경 기능은 더 이상 사용하지 않습니다.
      _0xbbff();
      prettyAlert('안내', '비밀번호는 이제 서버에서 관리됩니다. 변경이 필요하면 관리자에게 새 비밀번호를 알려주세요 — 서버 설정(PASSWORD_HASH)을 갱신해드립니다.');
    }

    function _0x77aa(e) {
      if(e.target.checked && _0xcatSub === '\uC77C\uBC18') {
        e.target.checked = false;
        prettyAlert('\uC120\uD0DD \uBD88\uAC00', '\uAE09\uC720\uAE30 \uBD84\uD560 \uC635\uC158\uC740 [\uACC4\uD1B5\uCD9C\uD558] \uB610\uB294 [\uC790\uCCB4\uC870\uB2EC] \uBD84\uB958\uC5D0\uC11C\uB9CC \uACB0\uD569 \uC801\uC6A9 \uAC00\uB2A5\uD569\uB2C8\uB2E4.\n\uBA3C\uC800 \uAC70\uB798 \uB300\uBD84\uB958\uB97C \uBCC0\uACBD\uD574\uC8FC\uC138\uC694.');
        return;
      }
      var box = document.getElementById('oil-subs');
      if(e.target.checked) box.style.display = 'block';
      else box.style.display = 'none';
    }

    // 엔터키 연동 처리 바인딩 완료
    document.getElementById('auth-pw').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('auth-submit').click();
      }
    });

    // 🔒 [무반응 종결 핵심] 글로벌 실행 레이어 완전 조율 마운트 완료
    document.getElementById('auth-submit').addEventListener('click', async () => {
      const pw = document.getElementById('auth-pw').value;
      const err = document.getElementById('auth-err');
      const lock = document.getElementById('auth-lock');
      const submitBtn = document.getElementById('auth-submit');

      if (!pw) {
        err.textContent = '비밀번호를 입력해주세요.';
        return;
      }

      lock.style.display = 'none';
      err.textContent = '';
      submitBtn.disabled = true;
      const originalLabel = submitBtn.textContent;
      submitBtn.textContent = '확인 중...';

      try {
        const res = await fetch(API_BASE + '/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pw })
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          if (res.status === 429) {
            lock.style.display = 'block';
            lock.textContent = (data && data.error) || '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.';
          } else {
            err.textContent = (data && data.error) || '비밀번호가 일치하지 않습니다.';
          }
          return;
        }

        setToken(data.token);
        document.getElementById('auth-layer').classList.add('hidden');
        document.getElementById('main-content').classList.add('visible');
        await _0x99aa_load();
        _0x88ff();
      } catch (e) {
        err.textContent = '서버에 연결할 수 없습니다. 인터넷 연결 또는 서버 상태(Render)를 확인해주세요.';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    });

    document.getElementById('tab-form').addEventListener('click', () => {
      document.getElementById('tab-form').classList.add('on');
      document.getElementById('tab-list').classList.remove('on');
      document.getElementById('page-form').style.display = 'block';
      document.getElementById('page-list').style.display = 'none';
    });

    document.getElementById('tab-list').addEventListener('click', () => {
      document.getElementById('tab-list').classList.add('on');
      document.getElementById('tab-form').classList.remove('on');
      document.getElementById('page-list').style.display = 'block';
      document.getElementById('page-form').style.display = 'none';
      _0x88ff();
    });

    document.getElementById('btn-add-item-row').addEventListener('click', createNewItemRow);
    document.getElementById('save-btn').addEventListener('click', _0x44cc);
    
    document.getElementById('btn-reset').addEventListener('click', () => {
      prettyConfirm('양식 초기화 확인', '현재 작성 중인 거래명세서 폼 데이터 전체가 리셋됩니다. 진행하시겠습니까?', () => {
        _0x33dd();
      });
    });

    document.getElementById('fl-search').addEventListener('input', () => { currentPage = 1; _0x88ff(); });
    document.getElementById('fl-region').addEventListener('input', () => { currentPage = 1; _0x88ff(); });
    document.getElementById('fl-sdate').addEventListener('change', () => { currentPage = 1; _0x88ff(); });
    document.getElementById('fl-edate').addEventListener('change', () => { currentPage = 1; _0x88ff(); });
    
    document.getElementById('chk-all').addEventListener('change', (e) => {
      document.querySelectorAll('.chk-row').forEach(c => c.checked = e.target.checked);
      _0xRenderSumText();
    });

    // [수정사항] \uAC1C\uBCC4 \uD589 \uCCB4\uD06C\uBC15\uC2A4\uB294 \uB3D9\uC801 \uC0DD\uC131\uB418\uBBC0\uB85C \uC774\uBCA4\uD2B8 \uC704\uC784(delegation) \uBC29\uC2DD\uC73C\uB85C \uBC14\uC778\uB529
    document.getElementById('list-body').addEventListener('change', (e) => {
      if (e.target && e.target.classList.contains('chk-row')) {
        _0xRenderSumText();
      }
    });

    document.getElementById('btn-sel-excel').addEventListener('click', () => {
      const checkedBoxes = document.querySelectorAll('.chk-row:checked');
      if(checkedBoxes.length === 0) {
        prettyAlert('선택 항목 없음', '엑셀 변환을 수행할 명세 내역 체크박스를 최소 1개 선택하세요.');
        return;
      }
      let targets = [];
      checkedBoxes.forEach(cb => {
        const id = cb.getAttribute('data-id');
        const r = _0x7a8d.find(x => x.id === id);
        if(r) targets.push(r);
      });
      downloadLivePremiumExcel(targets);
    });

    document.getElementById('btn-excel').addEventListener('click', () => {
      if(_0x7a8d.length === 0) {
        prettyAlert('백업 데이터 없음', '스토리지에 저장된 전체 거래내역 데이터가 존재하지 않습니다.');
        return;
      }
      // CSV 형식 백업
      var header = '날짜,작성자,거래처,성명,지역,분류,총공급가액,총세액,합계금액,품목상세,비고';
      var lines = [header];
      _0x7a8d.forEach(function(r) {
        var itemsStr = r.items.map(function(it) { return it.item + '(' + it.qty + 'x' + it.price + ')'; }).join(' / ');
        var row = [
          r.date, r.author, '"' + (r.company||'').replace(/"/g,'""') + '"',
          '"' + (r.name||'').replace(/"/g,'""') + '"', r.region, '"' + (r.part||'') + '"',
          r.amount, r.tax, (r.amount + r.tax),
          '"' + itemsStr.replace(/"/g,'""') + '"', '"' + (r.note||'').replace(/"/g,'""') + '"'
        ].join(',');
        lines.push(row);
      });
      var bom = '\uFEFF';
      var blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = '\uB0B4\uD3EC\uB18D\uAE30\uACC4_\uC804\uCCB4\uBC31\uC5C5_' + new Date().toISOString().slice(0,10) + '.csv';
      a.click();
      URL.revokeObjectURL(url);
    });

    document.getElementById('hdr-logout').addEventListener('click', () => {
      prettyConfirm('로그아웃 확인', '보안 세션을 종료하고 안전하게 로그아웃 하시겠습니까?', () => {
        sessionStorage.clear();
        location.reload();
      });
    });

    document.getElementById('hdr-pwchg').addEventListener('click', () => {
      prettyAlert('비밀번호 변경 안내', '비밀번호는 이제 서버에서 관리됩니다. 변경이 필요하면 관리자에게 새 비밀번호를 알려주세요 — 서버 설정(PASSWORD_HASH)을 갱신해드립니다.');
    });

    document.getElementById('btn-print-submit').addEventListener('click', () => { window.print(); });
    document.getElementById('btn-print-excel').addEventListener('click', () => { if (_0x5d4c) downloadLivePremiumExcel([_0x5d4c]); });
    document.getElementById('btn-download-live-excel').addEventListener('click', () => { if (_0x5d4c) downloadLivePremiumExcel([_0x5d4c]); });
    document.getElementById('btn-print-live-excel').addEventListener('click', () => { if (_0x5d4c) printDirectlyFromOverlay(_0x5d4c); });
    
    // 오타 완벽 복구 교정 마운트 완료
    document.getElementById('btn-print-close').addEventListener('click', _0xbbff);
    document.getElementById('btn-pwd-cancel').addEventListener('click', _0xbbff);
    document.getElementById('btn-pwd-submit').addEventListener('click', _0xeedd);
    document.getElementById('f-isoil').addEventListener('change', _0x77aa);
    
    document.querySelectorAll('#cat-pills .pill').forEach(b => {
      b.addEventListener('click', () => _0x55aa(b.getAttribute('data-cat')));
    });
    document.querySelectorAll('#supplier-pills .pill').forEach(b => {
      b.addEventListener('click', () => _0xSelectSupplier(b.getAttribute('data-supplier')));
    });
    document.querySelectorAll('#oil-pills .pill').forEach(b => {
      b.addEventListener('click', () => _0x66bb(b.getAttribute('data-oil')));
    });
    
    document.querySelectorAll('#gen-pills .pill').forEach(b => {
      b.addEventListener('click', () => {
        _0xgenSub = b.getAttribute('data-gen');
        document.querySelectorAll('#gen-pills .pill').forEach(x => {
          if(x.getAttribute('data-gen') === _0xgenSub) x.classList.add('g');
          else x.classList.remove('g');
        });
      });
    });
  })();
