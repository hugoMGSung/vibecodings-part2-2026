const emoji_pool = [
  "🍇", "🍓", "🥝", "🍑", "🍎", "🍉", "🍒", "🍊", "🍐", "🍍",
  "🥭", "🍋", "🍌", "🍈", "🫐", "🍏", "🥥", "🍅", "🥕", "🥑",
  "🌽", "🥦", "🧄", "🧅", "🥔", "🍄", "🥨", "🧀", "🥐", "🍞",
  "🥯", "🍪", "🍩", "🍰", "🧁", "🍫", "🍿", "🍭", "🍬", "🍯",
  "☕", "🫖", "🧋", "🥤", "🧃", "🥛", "🚗", "🚕", "🚌", "🚑",
  "🚒", "🚜", "🚲", "✈️", "🚀", "🚢", "⛵", "🏰", "🎮", "🎲",
  "🎯", "🎹", "🎸", "🥁", "⚽", "🏀", "🏈", "⚾", "🎾", "🏐",
  "🏓", "🥊", "🧭", "📚", "💡", "🔑", "🔥", "⭐", "🌈", "🌙",
  "☀️", "🌵", "🌻", "🍀", "🎁", "🎈", "🎨", "🧩", "🪁", "🎭",
  "🏆", "🛡️", "📯", "📌", "🖌️", "🧪", "🧰", "🪄", "🎤", "🎬",
];

const stage_order = [
  { key: "easy", label: "쉬움", board_size: 2, time_limit: 25 },
  { key: "medium1", label: "중간1", board_size: 4, time_limit: 50 },
  { key: "medium2", label: "중간2", board_size: 6, time_limit: 90 },
  { key: "medium3", label: "중간3", board_size: 8, time_limit: 130 },
  { key: "hard", label: "어려움", board_size: 10, time_limit: 180 },
];

const stage_bonus = 100;

const board_element = document.getElementById("board");
const stage_name_element = document.getElementById("stageName");
const attempt_count_element = document.getElementById("attemptCount");
const score_count_element = document.getElementById("scoreCount");
const timer_count_element = document.getElementById("timerCount");
const message_element = document.getElementById("message");
const restart_button = document.getElementById("restartButton");
const start_screen_element = document.getElementById("startScreen");
const start_button_element = document.getElementById("startButton");
const result_screen_element = document.getElementById("resultScreen");
const result_kicker_element = document.getElementById("resultKicker");
const result_title_element = document.getElementById("resultTitle");
const result_text_element = document.getElementById("resultText");
const result_button_element = document.getElementById("resultButton");

let current_stage_index = 0;
let current_stage = stage_order[current_stage_index];
let current_pairs = 0;
let attempt_count = 0;
let score_count = 0;
let remaining_time = current_stage.time_limit;
let first_card = null;
let second_card = null;
let board_locked = false;
let game_started = false;
let game_finished = false;
let timer_id = null;
let mismatch_timeout_id = null;
let stage_transition_id = null;

function shuffle_array(array) {
  const shuffled_array = [...array];

  for (let index = shuffled_array.length - 1; index > 0; index -= 1) {
    const random_index = Math.floor(Math.random() * (index + 1));
    [shuffled_array[index], shuffled_array[random_index]] = [shuffled_array[random_index], shuffled_array[index]];
  }

  return shuffled_array;
}

function set_message(text, state = "") {
  message_element.textContent = text;
  message_element.classList.remove("is-success", "is-danger");

  if (state === "success") {
    message_element.classList.add("is-success");
  }

  if (state === "danger") {
    message_element.classList.add("is-danger");
  }
}

function update_stage_display() {
  stage_name_element.textContent = current_stage.label;
}

function update_attempt_display() {
  attempt_count_element.textContent = attempt_count;
}

function update_score_display() {
  score_count_element.textContent = score_count;
}

function update_timer_display() {
  timer_count_element.textContent = remaining_time;
}

function stop_timer() {
  if (timer_id) {
    clearInterval(timer_id);
    timer_id = null;
  }
}

function stop_mismatch_timer() {
  if (mismatch_timeout_id) {
    clearTimeout(mismatch_timeout_id);
    mismatch_timeout_id = null;
  }
}

function stop_stage_transition() {
  if (stage_transition_id) {
    clearTimeout(stage_transition_id);
    stage_transition_id = null;
  }
}

function reset_selection() {
  first_card = null;
  second_card = null;
  board_locked = false;
}

function get_pair_count() {
  return (current_stage.board_size * current_stage.board_size) / 2;
}

function get_current_stage_index() {
  return current_stage_index;
}

function get_next_stage() {
  const next_index = get_current_stage_index() + 1;

  if (next_index >= stage_order.length) {
    return null;
  }

  return stage_order[next_index];
}

function render_board() {
  const pair_count = get_pair_count();
  current_pairs = pair_count;

  board_element.innerHTML = "";
  board_element.style.gridTemplateColumns = `repeat(${current_stage.board_size}, minmax(0, 1fr))`;

  const selected_emojis = shuffle_array(emoji_pool).slice(0, pair_count);
  const cards = shuffle_array([...selected_emojis, ...selected_emojis]);

  cards.forEach((emoji) => {
    const card_element = document.createElement("button");
    card_element.type = "button";
    card_element.className = "card";
    card_element.dataset.value = emoji;
    card_element.setAttribute("aria-label", "카드");

    const emoji_element = document.createElement("span");
    emoji_element.className = "emoji";
    emoji_element.textContent = emoji;

    card_element.appendChild(emoji_element);
    card_element.addEventListener("click", () => handle_card_click(card_element));
    board_element.appendChild(card_element);
  });
}

function start_timer() {
  stop_timer();

  timer_id = setInterval(() => {
    if (!game_started || game_finished) {
      stop_timer();
      return;
    }

    remaining_time -= 1;
    update_timer_display();

    if (remaining_time <= 0) {
      remaining_time = 0;
      update_timer_display();
      handle_game_over();
    }
  }, 1000);
}

function apply_stage(stage_index, keep_score = true) {
  stop_timer();
  stop_mismatch_timer();
  stop_stage_transition();

  current_stage_index = stage_index;
  current_stage = stage_order[current_stage_index];
  remaining_time = current_stage.time_limit;
  game_started = true;
  game_finished = false;
  board_locked = false;
  reset_selection();

  if (!keep_score) {
    attempt_count = 0;
    score_count = 0;
    update_attempt_display();
    update_score_display();
  }

  update_stage_display();
  update_timer_display();
  render_board();
  set_message(`${current_stage.label} 단계가 시작되었습니다.`);
  start_timer();
}

function start_game() {
  start_screen_element.hidden = true;
  result_screen_element.hidden = true;
  apply_stage(0, false);
}

function return_to_start_screen() {
  stop_timer();
  stop_mismatch_timer();
  stop_stage_transition();

  game_started = false;
  game_finished = false;
  current_stage_index = 0;
  current_stage = stage_order[0];
  remaining_time = current_stage.time_limit;
  attempt_count = 0;
  score_count = 0;
  board_element.innerHTML = "";
  set_message("시작하기 버튼을 눌러 게임을 시작하세요.");
  update_stage_display();
  update_attempt_display();
  update_score_display();
  update_timer_display();
  result_screen_element.hidden = true;
  start_screen_element.hidden = false;
}

function show_result_screen(mode) {
  const is_complete = mode === "complete";

  result_kicker_element.textContent = is_complete ? "Puzzle Clear" : "Game Over";
  result_title_element.textContent = is_complete ? "모든 단계를 완료했습니다!" : "시간이 다 되었어요!";
  result_text_element.textContent = is_complete
    ? `축하합니다. 최종 점수는 ${score_count}점, 시도 횟수는 ${attempt_count}회입니다.`
    : `아쉽지만 시간 초과입니다. 점수는 ${score_count}점, 시도 횟수는 ${attempt_count}회입니다.`;
  result_button_element.textContent = is_complete ? "처음부터 다시하기" : "다시 도전하기";

  result_screen_element.hidden = false;
  start_screen_element.hidden = true;
}

function finish_game(mode) {
  game_finished = true;
  game_started = false;
  board_locked = true;
  stop_timer();
  stop_mismatch_timer();
  stop_stage_transition();
  show_result_screen(mode);
}

function advance_to_next_stage() {
  const next_stage = get_next_stage();

  if (!next_stage) {
    finish_game("complete");
    return;
  }

  score_count += stage_bonus;
  update_score_display();
  board_locked = true;
  stop_timer();
  stop_mismatch_timer();

  set_message(`${current_stage.label} 완료! 보너스 +${stage_bonus}점, 다음 단계로 이동합니다.`, "success");

  stage_transition_id = setTimeout(() => {
    stage_transition_id = null;
    apply_stage(current_stage_index + 1, true);
  }, 1200);
}

function handle_stage_clear() {
  set_message(`${current_stage.label}를 모두 맞췄습니다!`, "success");
  advance_to_next_stage();
}

function handle_game_over() {
  set_message("시간이 끝났습니다. 게임 오버입니다.", "danger");
  finish_game("gameover");
}

function mark_cards_as_matched(first_element, second_element) {
  first_element.classList.add("matched");
  second_element.classList.add("matched");
  first_element.disabled = true;
  second_element.disabled = true;
}

function compare_cards() {
  return first_card.dataset.value === second_card.dataset.value;
}

function hide_card(card_element) {
  if (!card_element) {
    return;
  }

  card_element.classList.remove("flipped");
}

function handle_matched_pair() {
  mark_cards_as_matched(first_card, second_card);
  score_count += 10;
  update_score_display();
  reset_selection();

  if (document.querySelectorAll(".card:not(.matched)").length === 0) {
    handle_stage_clear();
  } else {
    set_message("잘 찾았어요! 같은 그림입니다.", "success");
  }
}

function handle_mismatched_pair() {
  set_message("다른 그림입니다. 잠깐 뒤에 다시 뒤집어요.");

  stop_mismatch_timer();
  mismatch_timeout_id = setTimeout(() => {
    hide_card(first_card);
    hide_card(second_card);
    reset_selection();
    set_message("다시 같은 그림을 찾아보세요.");
  }, 700);
}

function handle_second_selection(card_element) {
  second_card = card_element;
  attempt_count += 1;
  update_attempt_display();
  board_locked = true;

  if (compare_cards()) {
    handle_matched_pair();
    return;
  }

  handle_mismatched_pair();
}

function handle_card_click(card_element) {
  if (!game_started || game_finished || board_locked || card_element === first_card || card_element.classList.contains("matched")) {
    return;
  }

  card_element.classList.add("flipped");

  if (!first_card) {
    first_card = card_element;
    return;
  }

  handle_second_selection(card_element);
}

function bind_events() {
  start_button_element.addEventListener("click", start_game);
  result_button_element.addEventListener("click", start_game);
  restart_button.addEventListener("click", return_to_start_screen);
}

function init_game() {
  bind_events();
  update_stage_display();
  update_attempt_display();
  update_score_display();
  update_timer_display();
  set_message("시작하기 버튼을 눌러 게임을 시작하세요.");
  start_screen_element.hidden = false;
  result_screen_element.hidden = true;
  board_element.innerHTML = "";
}

init_game();
