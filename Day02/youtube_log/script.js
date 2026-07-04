const STORAGE_KEY = "youtube_study_log_items";

const url_input_element = document.getElementById("urlInput");
const add_button_element = document.getElementById("addButton");
const clear_input_button_element = document.getElementById("clearInputButton");
const clear_button_element = document.getElementById("clearButton");
const log_list_element = document.getElementById("logList");
const empty_state_element = document.getElementById("emptyState");
const total_count_element = document.getElementById("totalCount");
const done_count_element = document.getElementById("doneCount");

let log_items = load_items();

function load_items() {
  const saved_value = localStorage.getItem(STORAGE_KEY);

  if (!saved_value) {
    return [];
  }

  try {
    const parsed_items = JSON.parse(saved_value);

    if (!Array.isArray(parsed_items)) {
      return [];
    }

    return parsed_items;
  } catch (error) {
    return [];
  }
}

function save_items() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(log_items));
}

function generate_id() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalize_url(raw_url) {
  return raw_url.trim();
}

function is_valid_url(url_string) {
  try {
    const parsed_url = new URL(url_string);
    return parsed_url.protocol === "http:" || parsed_url.protocol === "https:";
  } catch (error) {
    return false;
  }
}

function is_youtube_url(url_string) {
  try {
    const parsed_url = new URL(url_string);
    return parsed_url.hostname.includes("youtube.com") || parsed_url.hostname.includes("youtu.be");
  } catch (error) {
    return false;
  }
}

function extract_youtube_video_id(url_string) {
  try {
    const parsed_url = new URL(url_string);
    const hostname = parsed_url.hostname.replace("www.", "");

    if (hostname === "youtu.be") {
      return parsed_url.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (hostname.includes("youtube.com")) {
      const video_id = parsed_url.searchParams.get("v");
      if (video_id) {
        return video_id;
      }

      const path_parts = parsed_url.pathname.split("/").filter(Boolean);
      if (path_parts[0] === "shorts" || path_parts[0] === "embed") {
        return path_parts[1] || "";
      }
    }
  } catch (error) {
    return "";
  }

  return "";
}

function get_thumbnail_url(url_string) {
  const video_id = extract_youtube_video_id(url_string);

  if (!video_id) {
    return "";
  }

  return `https://i.ytimg.com/vi/${video_id}/hqdefault.jpg`;
}

function get_video_id_or_empty(url_string) {
  return extract_youtube_video_id(url_string).trim();
}

function get_placeholder_thumbnail() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#f3f4f6"/>
          <stop offset="100%" stop-color="#e5e7eb"/>
        </linearGradient>
      </defs>
      <rect width="480" height="270" rx="24" fill="url(#g)"/>
      <circle cx="240" cy="135" r="44" fill="#ef4444"/>
      <path d="M224 115 L224 155 L258 135 Z" fill="#fff"/>
      <text x="240" y="214" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#6b7280">YouTube Thumbnail</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function format_date(date_value) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date_value);
}

function get_display_title(item) {
  if (item.is_title_loading) {
    return "제목 불러오는 중...";
  }

  return item.title || "유튜브 영상";
}

function get_display_thumbnail(item) {
  return item.thumbnail_url || get_thumbnail_url(item.url);
}

async function fetch_youtube_title(url_string) {
  const oembed_url = `https://www.youtube.com/oembed?url=${encodeURIComponent(url_string)}&format=json`;
  const response = await fetch(oembed_url);

  if (!response.ok) {
    throw new Error("Failed to fetch YouTube title");
  }

  const data = await response.json();
  return typeof data.title === "string" ? data.title.trim() : "";
}

function update_item_by_id(item_id, updater) {
  log_items = log_items.map((item) => {
    if (item.id !== item_id) {
      return item;
    }

    return updater(item);
  });
}

function update_counts() {
  total_count_element.textContent = String(log_items.length);
  done_count_element.textContent = String(log_items.filter((item) => item.is_done).length);
}

function update_empty_state() {
  const has_items = log_items.length > 0;
  empty_state_element.hidden = has_items;
  empty_state_element.style.display = has_items ? "none" : "grid";
}

function create_action_button(label, class_name, on_click) {
  const button_element = document.createElement("button");
  button_element.type = "button";
  button_element.className = `action ${class_name}`.trim();
  button_element.textContent = label;
  button_element.addEventListener("click", on_click);
  return button_element;
}

function render_items() {
  log_list_element.innerHTML = "";

  const sorted_items = [...log_items].sort((left, right) => right.created_at - left.created_at);

  sorted_items.forEach((item) => {
    const item_element = document.createElement("li");
    item_element.className = `log-item${item.is_done ? " is-done" : ""}`;

    const thumbnail_link_element = document.createElement("a");
    thumbnail_link_element.className = "log-thumbnail-link";
    thumbnail_link_element.href = item.url;
    thumbnail_link_element.target = "_blank";
    thumbnail_link_element.rel = "noopener noreferrer";

    const thumbnail_image_element = document.createElement("img");
    thumbnail_image_element.className = "log-thumbnail";
    thumbnail_image_element.src = get_display_thumbnail(item) || get_placeholder_thumbnail();
    thumbnail_image_element.alt = item.title ? `${item.title} 썸네일` : "유튜브 영상 썸네일";
    thumbnail_image_element.loading = "lazy";
    thumbnail_image_element.referrerPolicy = "no-referrer";

    thumbnail_image_element.addEventListener("error", () => {
      thumbnail_image_element.hidden = true;
      thumbnail_link_element.classList.add("is-fallback");
      thumbnail_link_element.textContent = "썸네일 없음";
    });

    thumbnail_link_element.appendChild(thumbnail_image_element);

    const content_element = document.createElement("div");
    content_element.className = "log-content";

    const head_element = document.createElement("div");
    head_element.className = "log-head";

    const title_wrap_element = document.createElement("div");
    title_wrap_element.className = "log-title-wrap";

    const title_element = document.createElement("div");
    title_element.className = "log-title";
    title_element.textContent = get_display_title(item);

    const url_element = document.createElement("a");
    url_element.className = "log-url";
    url_element.href = item.url;
    url_element.target = "_blank";
    url_element.rel = "noopener noreferrer";
    url_element.textContent = item.url;

    title_wrap_element.appendChild(title_element);
    title_wrap_element.appendChild(url_element);

    const status_element = document.createElement("span");
    status_element.className = `status${item.is_done ? " is-done" : ""}`;
    status_element.textContent = item.is_done ? "학습완료" : "진행중";

    head_element.appendChild(title_wrap_element);
    head_element.appendChild(status_element);

    const meta_element = document.createElement("div");
    meta_element.className = "item-meta";
    meta_element.innerHTML = `<span>저장일시: ${format_date(item.created_at)}</span>`;

    const note_element = document.createElement("div");
    note_element.className = "item-note";
    note_element.textContent = item.note || "저장된 유튜브 학습 링크입니다.";

    const actions_element = document.createElement("div");
    actions_element.className = "actions";

    const toggle_button = create_action_button(
      item.is_done ? "완료 취소" : "완료 표시",
      "",
      () => toggle_done(item.id),
    );

    const open_button = create_action_button("열기", "", () => window.open(item.url, "_blank", "noopener,noreferrer"));

    const delete_button = create_action_button("삭제", "is-danger", () => delete_item(item.id));

    actions_element.appendChild(toggle_button);
    actions_element.appendChild(open_button);
    actions_element.appendChild(delete_button);

    content_element.appendChild(head_element);
    content_element.appendChild(meta_element);
    content_element.appendChild(note_element);
    content_element.appendChild(actions_element);

    item_element.appendChild(thumbnail_link_element);
    item_element.appendChild(content_element);

    log_list_element.appendChild(item_element);
  });

  update_counts();
  update_empty_state();
}

function add_item() {
  const raw_url = normalize_url(url_input_element.value);

  if (!raw_url) {
    alert("유튜브 URL을 입력해 주세요.");
    url_input_element.focus();
    return;
  }

  if (!is_valid_url(raw_url)) {
    alert("올바른 URL 형식이 아닙니다.");
    url_input_element.focus();
    return;
  }

  if (!is_youtube_url(raw_url)) {
    alert("유튜브 링크만 저장할 수 있습니다.");
    url_input_element.focus();
    return;
  }

  const video_id = get_video_id_or_empty(raw_url);

  if (!video_id) {
    alert("유튜브 영상 ID를 확인할 수 없습니다.");
    url_input_element.focus();
    return;
  }

  const already_exists = log_items.some((item) => item.video_id === video_id);

  if (already_exists) {
    alert("이미 저장된 유튜브 링크입니다.");
    url_input_element.focus();
    url_input_element.select();
    return;
  }

  const new_item = {
    id: generate_id(),
    url: raw_url,
    video_id,
    is_done: false,
    created_at: Date.now(),
    note: "학습용 유튜브 영상",
    title: "제목 불러오는 중...",
    is_title_loading: true,
    thumbnail_url: get_thumbnail_url(raw_url),
  };

  log_items.unshift(new_item);

  save_items();
  render_items();
  url_input_element.value = "";
  url_input_element.focus();

  fetch_youtube_title(raw_url)
    .then((fetched_title) => {
      update_item_by_id(new_item.id, (item) => ({
        ...item,
        title: fetched_title || "유튜브 영상",
        is_title_loading: false,
      }));

      save_items();
      render_items();
    })
    .catch(() => {
      update_item_by_id(new_item.id, (item) => ({
        ...item,
        title: "유튜브 영상",
        is_title_loading: false,
      }));

      save_items();
      render_items();
    });
}

function toggle_done(item_id) {
  log_items = log_items.map((item) => {
    if (item.id !== item_id) {
      return item;
    }

    return {
      ...item,
      is_done: !item.is_done,
    };
  });

  save_items();
  render_items();
}

function delete_item(item_id) {
  const should_delete = confirm("이 URL을 삭제할까요?");

  if (!should_delete) {
    return;
  }

  log_items = log_items.filter((item) => item.id !== item_id);
  save_items();
  render_items();
}

function clear_all_items() {
  if (log_items.length === 0) {
    alert("삭제할 항목이 없습니다.");
    return;
  }

  const should_clear = confirm("저장된 URL을 모두 삭제할까요?");

  if (!should_clear) {
    return;
  }

  log_items = [];
  save_items();
  render_items();
}

function bind_events() {
  add_button_element.addEventListener("click", add_item);
  clear_input_button_element.addEventListener("click", () => {
    url_input_element.value = "";
    url_input_element.focus();
  });
  clear_button_element.addEventListener("click", clear_all_items);
  url_input_element.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      add_item();
    }
  });
}

function init_app() {
  log_items = log_items.map((item) => ({
    ...item,
    title: item.title || item.note || "유튜브 영상",
    is_title_loading: Boolean(item.is_title_loading),
    video_id: item.video_id || get_video_id_or_empty(item.url),
    thumbnail_url: item.thumbnail_url || get_thumbnail_url(item.url),
  }));

  bind_events();
  render_items();
  url_input_element.focus();
}

init_app();
