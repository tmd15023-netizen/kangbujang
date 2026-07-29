(function () {
  'use strict';

  const CONTACT_PHONE = '1688-8304';
  const KAKAO_URL = 'https://open.kakao.com/o/s6rMaKii';
  // Google Apps Script 웹앱 URL (google-apps-script.gs 배포 후 입력)
  const INQUIRY_SHEET_URL = '';
  const BLOG_URL = 'https://blog.naver.com/jbbb1111';
  const PRESALE_CATEGORY_URL = 'https://blog.naver.com/PostList.naver?blogId=jbbb1111&from=postList&categoryNo=1';
  const BLOG_RSS_URL = 'https://rss.blog.naver.com/jbbb1111.xml';
  const BLOG_RSS_API = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(BLOG_RSS_URL);

  const REGION_BLOG_URL = 'https://blog.naver.com/bacigi08';
  const REGION_BLOG_RSS_URL = 'https://rss.blog.naver.com/bacigi08.xml';
  const REGION_BLOG_RSS_API = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(REGION_BLOG_RSS_URL);

  const DEFAULT_PROPERTY_IMAGE = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&h=300&fit=crop';
  const DEFAULT_PRESALE_IMAGE = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&h=375&fit=crop';
  const IMAGE_PROXY = 'https://wsrv.nl/';

  const presaleListings = [
    {
      id: 'fallback-1',
      title: '군산 예다음 즉시입주, 기다림 없이 바로 살수있는 새 아파트!!',
      link: 'https://blog.naver.com/jbbb1111/224337039395',
      pubDate: '2026-07-06',
      thumbnail: 'https://blogthumb.pstatic.net/MjAyNjA3MDVfMTg5/MDAxNzgzMjMxODkyMzc1.z95ZsryYzXjDyuMPiT5yWUUD9cCVOj8mIMVBrxeR4Mkg.uCqYOcBF0m6YQI5SClqshVNOKJmTE19sZkIeRKtSEG4g.PNG/image.png?type=s3',
      excerpt: '군산 예다음(군산신역세권 영무예다음 더 씨엘)은 이미 준공이 끝난 단지라, 계약하면 바로 입주 가능합니다.',
      category: '분양',
      featured: true
    },
    {
      id: 'fallback-2',
      title: '군산 예다음 잔여세대 특별분양, 즉시입주 가능',
      link: 'https://blog.naver.com/jbbb1111/224328867062',
      pubDate: '2026-06-27',
      thumbnail: 'https://blogthumb.pstatic.net/MjAyNjA2MjdfMTQy/MDAxNzgyNTM3MDgzMzA1.Z8afGB02eVfIxdMfvh4aOExu3DP_G4_gGyeWMDKTVEUg.iDXDyv2np3LXmq2kIwsOm6Vv9-Fo01XPi1CCaxDKjAQg.PNG/image.png?type=s3',
      excerpt: '군산신역세권 영무예다음 더 씨엘 잔여세대 특별분양 진행 중입니다.',
      category: '분양',
      featured: false
    }
  ];

  let presalePosts = [];
  let blogProperties = [];

  let recentViewed = [];
  let recentIndex = 0;

  const els = {
    propertyGrid: document.getElementById('propertyGrid'),
    presaleGrid: document.getElementById('presaleGrid'),
    recentList: document.getElementById('recentList'),
    propertyModal: document.getElementById('propertyModal'),
    modalBody: document.getElementById('modalBody'),
    toast: document.getElementById('toast'),
    inquiryModal: document.getElementById('inquiryModal'),
    inquiryModalDesc: document.getElementById('inquiryModalDesc')
  };

  function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html || '';
    return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
  }

  function escapeAttr(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function decodeHtmlEntities(str) {
    return String(str || '').replace(/&amp;/g, '&');
  }

  function extractThumbnailFromItem(item) {
    if (item.thumbnail) return decodeHtmlEntities(item.thumbnail);

    const html = item.description || item.content || '';
    const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (match) return decodeHtmlEntities(match[1]);

    if (item.enclosure && item.enclosure.link) {
      return decodeHtmlEntities(item.enclosure.link);
    }

    return '';
  }

  function isNaverImage(url) {
    return /pstatic\.net|naver\.net|navercdn\.com/.test(url || '');
  }

  function proxyImageUrl(url, width, height) {
    return IMAGE_PROXY + '?url=' + encodeURIComponent(url) +
      '&w=' + width + '&h=' + height + '&fit=cover&a=top&output=webp';
  }

  function resolveImageUrl(url, width, height, fallback) {
    if (!url) return fallback;
    if (isNaverImage(url)) return proxyImageUrl(url, width, height);
    return url;
  }

  function resolveBlogImage(item, width, height, fallback) {
    const raw = extractThumbnailFromItem(item);
    return resolveImageUrl(raw, width, height, fallback);
  }

  function getOriginalThumbnail(item, fallback) {
    const raw = extractThumbnailFromItem(item);
    return raw || fallback;
  }

  function buildPresaleImageTag(src, alt, fallback) {
    const safeSrc = escapeAttr(src);
    const safeAlt = escapeAttr(alt);
    const safeFallback = escapeAttr(fallback);

    return '<img class="presale-image" src="' + safeSrc + '" alt="' + safeAlt + '"' +
      ' loading="eager" decoding="async" referrerpolicy="no-referrer"' +
      ' onerror="this.onerror=null;this.src=\'' + safeFallback + '\'">';
  }

  function applyPresaleImageCrop(root) {
    const scope = root || document;
    scope.querySelectorAll('.presale-card .presale-image-wrap .presale-image').forEach(function (img) {
      function cropImage() {
        if (!img.naturalWidth || !img.naturalHeight) return;

        const wrap = img.closest('.presale-image-wrap');
        if (!wrap) return;

        const renderedHeight = img.getBoundingClientRect().height;
        wrap.style.height = ((renderedHeight * 2) / 3) + 'px';
      }

      if (img.complete) {
        cropImage();
      } else {
        img.addEventListener('load', cropImage, { once: true });
      }
    });
  }

  function buildImageTag(src, alt, className, fallback) {
    const safeSrc = escapeAttr(src);
    const safeAlt = escapeAttr(alt);
    const safeFallback = escapeAttr(fallback);

    return '<img class="' + className + '" src="' + safeSrc + '" alt="' + safeAlt + '"' +
      ' loading="eager" decoding="async" referrerpolicy="no-referrer"' +
      ' onerror="this.onerror=null;this.src=\'' + safeFallback + '\'">';
  }

  function cleanBlogLink(link) {
    return (link || BLOG_URL).split('?')[0];
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
  }

  function isPresalePost(item) {
    const categories = item.categories || (item.category ? [item.category] : []);
    return categories.some(function (c) {
      return String(c).replace(/\s/g, '') === '분양';
    });
  }

  function mapBlogItem(item, index) {
    return {
      id: item.guid || item.link || 'blog-' + index,
      title: item.title || '분양정보',
      link: cleanBlogLink(item.link),
      pubDate: item.pubDate,
      thumbnail: getOriginalThumbnail(item, DEFAULT_PRESALE_IMAGE),
      excerpt: stripHtml(item.description || item.content || '').slice(0, 120) + '...',
      category: (item.categories && item.categories[0]) || item.category || '분양',
      featured: index === 0
    };
  }

  function fetchBlogPresalePosts() {
    return fetch(BLOG_RSS_API)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.status !== 'ok' || !data.items) {
          throw new Error('RSS 응답 오류');
        }
        const posts = data.items.filter(isPresalePost).map(mapBlogItem);
        return posts.length > 0 ? posts : presaleListings;
      })
      .catch(function () {
        return presaleListings;
      });
  }

  function renderPresaleGrid() {
    if (presalePosts.length === 0) {
      els.presaleGrid.innerHTML = '<p class="presale-error">분양정보를 불러오지 못했습니다. <a href="' + PRESALE_CATEGORY_URL + '" target="_blank" rel="noopener noreferrer">블로그 분양 카테고리에서 확인하기</a></p>';
      return;
    }

    els.presaleGrid.innerHTML = presalePosts.map(function (item) {
      const featuredClass = item.featured ? ' featured' : '';
      const image = item.thumbnail || DEFAULT_PRESALE_IMAGE;

      return (
        '<article class="presale-card' + featuredClass + '" data-presale-id="' + item.id + '">' +
          '<div class="presale-image-wrap">' +
            buildPresaleImageTag(image, item.title, DEFAULT_PRESALE_IMAGE) +
            '<span class="presale-status status-open">' + item.category + '</span>' +
          '</div>' +
          '<div class="presale-body">' +
            '<p class="presale-date">' + formatDate(item.pubDate) + '</p>' +
            '<h3 class="presale-name">' + item.title + '</h3>' +
            '<p class="presale-excerpt">' + item.excerpt + '</p>' +
            '<span class="presale-read-btn">블로그에서 보기 →</span>' +
          '</div>' +
        '</article>'
      );
    }).join('');

    applyPresaleImageCrop(els.presaleGrid);
  }

  function openPresaleModal(presale) {
    const image = presale.thumbnail || DEFAULT_PRESALE_IMAGE;

    els.modalBody.innerHTML =
      (image ? buildPresaleImageTag(image, presale.title, DEFAULT_PRESALE_IMAGE) : '') +
      '<span class="presale-status status-open" style="display:inline-block;margin-bottom:10px;">' + presale.category + '</span>' +
      '<h3>' + presale.title + '</h3>' +
      '<p class="presale-date">' + formatDate(presale.pubDate) + '</p>' +
      '<p style="font-size:13px;color:#555;margin:8px 0;line-height:1.7;">' + presale.excerpt + '</p>' +
      '<a href="' + presale.link + '" class="modal-blog-btn" target="_blank" rel="noopener noreferrer">블로그 글 전체 보기</a>' +
      '<p style="margin-top:16px;font-size:12px;color:#777;">' +
        '분양 문의: <a href="tel:' + CONTACT_PHONE + '" style="color:#d9534f;">' + CONTACT_PHONE + '</a>' +
        ' · <a href="' + KAKAO_URL + '" target="_blank" rel="noopener noreferrer" style="color:#3c1e1e;">카카오 1:1 상담</a>' +
      '</p>';

    els.propertyModal.classList.add('open');
    els.propertyModal.setAttribute('aria-hidden', 'false');
  }

  function loadPresaleFromBlog() {
    els.presaleGrid.innerHTML = '<p class="presale-loading">블로그 분양정보를 불러오는 중...</p>';

    fetchBlogPresalePosts().then(function (posts) {
      presalePosts = posts;
      renderPresaleGrid();
    });
  }

  function isRegionPost(item) {
    const text = (item.title || '') + stripHtml(item.description || item.content || '');
    return /서천|장항|군산/.test(text);
  }

  function isListingPost(item) {
    const title = item.title || '';
    const cats = (item.categories || []).join('');
    if (/분양권|신축아파트분양/.test(title)) return false;
    if (/분양/.test(cats) && !/매매|전세|월세|임대/.test(title)) return false;
    return true;
  }

  function detectCategory(item) {
    const title = item.title || '';
    const cats = (item.categories || []).join(' ');
    const text = title + ' ' + cats;

    if (/원룸/.test(text)) return 'oneroom';
    if (/상가|점포/.test(text)) return 'commercial';
    if (/토지|공장|창고/.test(text)) return 'land';
    if (/빌라|다가구|근생/.test(text)) return 'multifamily';
    if (/아파트|투룸|쓰리룸/.test(text)) return 'tworoom';
    return 'tworoom';
  }

  function detectRentType(title) {
    if (/월세/.test(title)) return 'monthly';
    if (/전세/.test(title)) return 'jeonse';
    if (/매매|매각/.test(title)) return 'sale';
    return 'both';
  }

  function extractPrices(title) {
    const rentType = detectRentType(title);
    let jeonse = null;
    let monthly = null;

    const saleMatch = title.match(/매매[^0-9]*(\d+억?\s*\d*,?\d*)\s*만?원/);
    const jeonseMatch = title.match(/전세[^0-9]*(\d+억?\s*\d*,?\d*)\s*만?원/);
    const monthlyMatch = title.match(/보증금[^0-9]*(\d+억?\s*\d*,?\d*)\s*만?원?\s*월세\s*(\d+)\s*만?원/);

    if (saleMatch) {
      jeonse = saleMatch[1].replace(/\s/g, '') + '만원';
    } else if (jeonseMatch) {
      jeonse = jeonseMatch[1].replace(/\s/g, '') + '만원';
    }

    if (monthlyMatch) {
      monthly = monthlyMatch[1].replace(/\s/g, '') + '/' + monthlyMatch[2] + ' 만원';
    }

    return { jeonse: jeonse, monthly: monthly, rentType: rentType };
  }

  function extractLocation(title) {
    const cleaned = title.replace(/【[^】]+】/g, '').trim();
    const regionMatch = cleaned.match(/(서천[^\◆\[]*|장항[^\◆\[]*)/);
    if (regionMatch) return regionMatch[1].slice(0, 24);
    if (/서천/.test(title)) return '서천';
    if (/장항/.test(title)) return '장항';
    if (/군산/.test(title)) return '군산';
    return '서천·장항·군산';
  }

  function extractSpec(title) {
    const areaMatch = title.match(/(\d+\.?\d*)\s*㎡/);
    const pyMatch = title.match(/(\d+)\s*평/);
    if (areaMatch) return areaMatch[1] + '㎡';
    if (pyMatch) return pyMatch[1] + '평형';
    return '블로그 참조';
  }

  function getRibbonInfo(pubDate) {
    const days = (Date.now() - new Date(pubDate).getTime()) / (1000 * 60 * 60 * 24);
    if (days <= 7) return { ribbon: 'new', ribbonText: '신규' };
    if (days <= 30) return { ribbon: 'hot', ribbonText: 'HOT' };
    return { ribbon: 'recommend', ribbonText: '추천매물' };
  }

  function mapRegionBlogItem(item, index) {
    const title = item.title || '';
    const prices = extractPrices(title);
    const ribbon = getRibbonInfo(item.pubDate);
    const blogCategory = (item.categories && item.categories[0]) || '';

    return {
      id: item.guid || item.link || 'region-' + index,
      category: detectCategory(item),
      title: title.replace(/【[^】]+】/g, '').slice(0, 40) || '매물',
      fullTitle: title,
      location: extractLocation(title),
      spec: extractSpec(title),
      rooms: blogCategory || '서천·장항·군산',
      jeonse: prices.jeonse,
      monthly: prices.monthly,
      rentType: prices.rentType,
      ribbon: ribbon.ribbon,
      ribbonText: ribbon.ribbonText,
      image: resolveBlogImage(item, 480, 360, DEFAULT_PROPERTY_IMAGE),
      link: cleanBlogLink(item.link),
      excerpt: stripHtml(item.description || '').slice(0, 100) + '...',
      pubDate: item.pubDate,
      isBlog: true
    };
  }

  function fetchRegionBlogProperties() {
    return fetch(REGION_BLOG_RSS_API)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.status !== 'ok' || !data.items) {
          throw new Error('RSS 응답 오류');
        }
        return data.items
          .filter(isRegionPost)
          .filter(isListingPost)
          .map(mapRegionBlogItem);
      })
      .catch(function () {
        return [];
      });
  }

  function loadRegionBlogProperties() {
    els.propertyGrid.innerHTML = '<p class="no-results">서천·장항·군산 매물을 불러오는 중...</p>';

    fetchRegionBlogProperties().then(function (items) {
      blogProperties = items;
      renderPropertyGrid();
    });
  }

  function getFilteredProperties() {
    return blogProperties;
  }

  function renderPropertyGrid() {
    const filtered = getFilteredProperties();

    if (filtered.length === 0) {
      els.propertyGrid.innerHTML =
        '<p class="no-results">서천·장항·군산 지역 매물이 없습니다.<br>' +
        '<a href="' + REGION_BLOG_URL + '" target="_blank" rel="noopener noreferrer" style="color:#d9534f;margin-top:8px;display:inline-block;">블로그에서 전체 매물 보기</a></p>';
      return;
    }

    els.propertyGrid.innerHTML = filtered.map(function (p) {
      const ribbonClass = 'ribbon-' + p.ribbon;
      let pricesHtml = '';

      if (p.jeonse && p.rentType !== 'monthly') {
        const labelClass = p.rentType === 'sale' ? 'label-sale' : 'label-jeon';
        const labelText = p.rentType === 'sale' ? '매매가' : '전세가';
        pricesHtml += '<div class="price-row"><span class="price-label ' + labelClass + '">' + labelText + '</span><span class="price-value">' + p.jeonse + '</span></div>';
      }
      if (p.monthly) {
        pricesHtml += '<div class="price-row"><span class="price-label label-wol">월세가</span><span class="price-value">' + p.monthly + '</span></div>';
      }

      return (
        '<article class="property-card" data-id="' + p.id + '">' +
          '<div class="card-image-wrap">' +
            buildImageTag(p.image, p.title, 'card-image', DEFAULT_PROPERTY_IMAGE) +
            '<span class="card-ribbon ' + ribbonClass + '">' + p.ribbonText + '</span>' +
          '</div>' +
          '<div class="card-body">' +
            '<h3 class="card-title">' + p.title + '</h3>' +
            '<p class="card-detail">' + p.location + ' [' + p.rooms + ']</p>' +
            '<p class="card-spec">' + p.spec + '</p>' +
            '<div class="card-prices">' + pricesHtml + '</div>' +
            '<span class="card-blog-link">블로그에서 보기 →</span>' +
          '</div>' +
        '</article>'
      );
    }).join('');
  }

  function findPropertyById(id) {
    return blogProperties.find(function (p) { return String(p.id) === String(id); });
  }

  function addToRecent(property) {
    recentViewed = recentViewed.filter(function (p) { return p.id !== property.id; });
    recentViewed.unshift(property);
    if (recentViewed.length > 10) recentViewed.pop();
    renderRecentList();
  }

  function renderRecentList() {
    if (recentViewed.length === 0) {
      els.recentList.innerHTML = '<li class="recent-empty">아직 본 매물이 없습니다.</li>';
      return;
    }

    els.recentList.innerHTML = recentViewed.map(function (p) {
      return (
        '<li data-id="' + p.id + '">' +
          buildImageTag(p.image, p.title, 'recent-item-img', DEFAULT_PROPERTY_IMAGE) +
          '<p class="recent-item-name">' + p.title + ' · ' + p.location + '</p>' +
        '</li>'
      );
    }).join('');

    updateRecentScroll();
  }

  function updateRecentScroll() {
    const items = els.recentList.querySelectorAll('li:not(.recent-empty)');
    items.forEach(function (item, i) {
      item.style.display = (i >= recentIndex && i < recentIndex + 3) ? 'block' : 'none';
    });
  }

  function openModal(property) {
    if (property.isBlog) {
      let pricesHtml = '';
      if (property.jeonse) {
        const labelText = property.rentType === 'sale' ? '매매가' : '전세가';
        pricesHtml += '<p><strong>' + labelText + ':</strong> ' + property.jeonse + '</p>';
      }
      if (property.monthly) {
        pricesHtml += '<p><strong>월세가:</strong> ' + property.monthly + '</p>';
      }

      els.modalBody.innerHTML =
        buildImageTag(property.image, property.title, '', DEFAULT_PROPERTY_IMAGE) +
        '<h3>' + property.fullTitle + '</h3>' +
        '<p>' + property.location + ' · ' + formatDate(property.pubDate) + '</p>' +
        '<p style="font-size:12px;color:#666;margin:8px 0;">' + property.excerpt + '</p>' +
        '<div class="modal-prices">' + pricesHtml + '</div>' +
        '<a href="' + property.link + '" class="modal-blog-btn" target="_blank" rel="noopener noreferrer">블로그 글 전체 보기</a>' +
        '<p style="margin-top:16px;font-size:12px;color:#777;">' +
          '문의: <a href="tel:' + CONTACT_PHONE + '" style="color:#d9534f;">' + CONTACT_PHONE + '</a>' +
          ' · <a href="' + KAKAO_URL + '" target="_blank" rel="noopener noreferrer" style="color:#3c1e1e;">카카오 1:1 상담</a>' +
        '</p>';

      els.propertyModal.classList.add('open');
      els.propertyModal.setAttribute('aria-hidden', 'false');
      return;
    }

    let pricesHtml = '';
    if (property.jeonse) {
      const labelText = property.rentType === 'sale' ? '매매가' : '전세가';
      pricesHtml += '<p><strong>' + labelText + ':</strong> ' + property.jeonse + '</p>';
    }
    if (property.monthly) {
      pricesHtml += '<p><strong>월세가:</strong> ' + property.monthly + '</p>';
    }

    els.modalBody.innerHTML =
      buildImageTag(property.image, property.title, '', DEFAULT_PROPERTY_IMAGE) +
      '<h3>' + property.title + '</h3>' +
      '<p>' + property.location + '</p>' +
      '<p>' + property.spec + ' · ' + property.rooms + '</p>' +
      '<div class="modal-prices">' + pricesHtml + '</div>' +
      '<p style="margin-top:12px;font-size:12px;color:#777;">' +
        '문의: <a href="tel:' + CONTACT_PHONE + '" style="color:#d9534f;">' + CONTACT_PHONE + '</a>' +
        ' · <a href="' + KAKAO_URL + '" target="_blank" rel="noopener noreferrer" style="color:#3c1e1e;">카카오 1:1 상담</a>' +
      '</p>';

    els.propertyModal.classList.add('open');
    els.propertyModal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    els.propertyModal.classList.remove('open');
    els.propertyModal.setAttribute('aria-hidden', 'true');
  }

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    setTimeout(function () { els.toast.classList.remove('show'); }, 2500);
  }

  const INQUIRY_TYPE_LABELS = {
    sell: '매도 의뢰',
    buy: '매수 의뢰',
    'rent-out': '임대 의뢰',
    'rent-in': '임차 의뢰'
  };

  function buildInquiryPayload(formData) {
    const name = (formData.get('이름') || formData.get('name') || '').trim();
    const phone = (formData.get('연락처') || formData.get('phone') || '').trim();
    const typeKey = formData.get('type') || '';
    const type = (formData.get('의뢰유형') || INQUIRY_TYPE_LABELS[typeKey] || typeKey || '').trim();
    const message = (formData.get('문의 내용') || formData.get('message') || '').trim();

    return {
      name: name,
      phone: phone,
      type: type,
      message: message,
      submitted_at: new Date().toLocaleString('ko-KR')
    };
  }

  function saveInquiryLocally(payload) {
    try {
      const list = JSON.parse(localStorage.getItem('kangboss_inquiries') || '[]');
      list.unshift(payload);
      localStorage.setItem('kangboss_inquiries', JSON.stringify(list.slice(0, 100)));
    } catch (err) {
      // ignore storage errors
    }
  }

  function showInquirySuccessModal(isSheetConnected) {
    if (isSheetConnected) {
      els.inquiryModalDesc.textContent = '의뢰 내용이 Google 스프레드시트와 이메일로 저장되었습니다. 빠른 시일 내에 연락드리겠습니다.';
    } else {
      els.inquiryModalDesc.textContent = '의뢰 내용이 브라우저에 임시 저장되었습니다. Google 시트 연동을 완료하면 이메일로도 받을 수 있습니다.';
    }

    els.inquiryModal.classList.add('open');
    els.inquiryModal.setAttribute('aria-hidden', 'false');
  }

  function submitInquiry(form) {
    const payload = buildInquiryPayload(new FormData(form));
    const submitBtn = form.querySelector('.submit-btn');

    if (!payload.name || !payload.phone || !payload.type || !payload.message) {
      showToast('모든 항목을 입력해 주세요.');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '접수 중...';

    document.getElementById('inquirySubmittedAt').value = payload.submitted_at;
    saveInquiryLocally(payload);

    if (INQUIRY_SHEET_URL) {
      form.action = INQUIRY_SHEET_URL;
      form.submit();

      setTimeout(function () {
        form.reset();
      }, 500);

      showInquirySuccessModal(true);
      showToast('의뢰가 접수되었습니다.');
    } else {
      form.reset();
      showInquirySuccessModal(false);
      showToast('임시 저장되었습니다. Google 시트 연동을 완료해 주세요.');
    }

    submitBtn.disabled = false;
    submitBtn.textContent = '의뢰 접수하기';
  }

  function initInquiryModal() {
    document.getElementById('inquiryModalOkBtn').addEventListener('click', closeInquiryModal);
    document.getElementById('inquiryModalClose').addEventListener('click', closeInquiryModal);
    document.getElementById('inquiryModalBackdrop').addEventListener('click', closeInquiryModal);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && els.inquiryModal.classList.contains('open')) {
        closeInquiryModal();
      }
    });
  }

  function initPropertyGrid() {
    els.propertyGrid.addEventListener('click', function (e) {
      const card = e.target.closest('.property-card');
      if (!card) return;
      const id = card.dataset.id;
      const property = findPropertyById(id);
      if (property) {
        addToRecent(property);
        openModal(property);
      }
    });
  }

  function initRecent() {
    els.recentList.addEventListener('click', function (e) {
      const li = e.target.closest('li[data-id]');
      if (!li) return;
      const id = li.dataset.id;
      const property = findPropertyById(id);
      if (property) openModal(property);
    });

    document.getElementById('recentPrev').addEventListener('click', function () {
      if (recentIndex > 0) {
        recentIndex--;
        updateRecentScroll();
      }
    });

    document.getElementById('recentNext').addEventListener('click', function () {
      if (recentIndex < recentViewed.length - 3) {
        recentIndex++;
        updateRecentScroll();
      }
    });
  }

  function initModal() {
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalBackdrop').addEventListener('click', closeModal);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
    });
  }

  function initFavorite() {
    document.getElementById('addFavorite').addEventListener('click', function (e) {
      e.preventDefault();
      showToast('즐겨찾기에 추가되었습니다.');
    });
  }

  function closeInquiryModal() {
    els.inquiryModal.classList.remove('open');
    els.inquiryModal.setAttribute('aria-hidden', 'true');
  }

  function initInquiryForm() {
    const form = document.getElementById('inquiryForm');

    if (INQUIRY_SHEET_URL) {
      form.action = INQUIRY_SHEET_URL;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submitInquiry(form);
    });
  }

  function initPresale() {
    loadPresaleFromBlog();

    els.presaleGrid.addEventListener('click', function (e) {
      const card = e.target.closest('.presale-card');
      if (!card) return;
      const id = card.dataset.presaleId;
      const presale = presalePosts.find(function (p) { return String(p.id) === String(id); });
      if (presale) openPresaleModal(presale);
    });

    document.querySelector('.nav-presale').addEventListener('click', function (e) {
      e.preventDefault();
      document.getElementById('presale').scrollIntoView({ behavior: 'smooth' });
    });
  }

  function init() {
    loadRegionBlogProperties();
    loadPresaleFromBlog();
    renderRecentList();
    initPropertyGrid();
    initPresale();
    initRecent();
    initModal();
    initFavorite();
    initInquiryForm();
    initInquiryModal();
  }

  init();
})();
