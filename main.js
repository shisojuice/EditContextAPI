const canvas = document.getElementById("editor-canvas");
const ctx = canvas.getContext("2d");
const FONT_SIZE = 16;
ctx.font = `${FONT_SIZE}px monospace`;
const edit = new EditContext();
canvas.editContext = edit;

const TEXT_X = 10;
const TEXT_Y = 30;
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "black";
  ctx.fillText(edit.text, TEXT_X, TEXT_Y);
}

// 文字列の幅を計算するヘルパー関数
function measureTextWidth(text) {
  return ctx.measureText(text).width;
}

// カーソル位置を表示する
function drawTextCursor() {
  let cursorVisible = true;
  setInterval(() => {
    const cursorX = measureTextWidth(edit.text.substring(0, edit.selectionEnd)) + TEXT_X;
    ctx.clearRect(cursorX, TEXT_Y - FONT_SIZE, 2, FONT_SIZE);
    if (cursorVisible && edit.selectionStart === edit.selectionEnd) { // 選択範囲がない場合のみカーソルを表示
      ctx.fillStyle = "black";
      ctx.fillRect(cursorX, TEXT_Y - FONT_SIZE, 2, FONT_SIZE);
    }
    cursorVisible = !cursorVisible;
  }, 500);
}

function breakTextCursor(prev_selection) {
  ctx.clearRect(prev_selection * FONT_SIZE + TEXT_X, TEXT_Y - FONT_SIZE, 2, FONT_SIZE);
}
drawTextCursor();

// キャンバスの境界情報を更新する
function updateControlBounds() {
  const controlBound = canvas.getBoundingClientRect();
  edit.updateControlBounds(controlBound);
}
updateControlBounds();
window.addEventListener("resize", updateControlBounds);

// IMEの入力開始イベント
edit.addEventListener("compositionstart", (e) => {
  canvas.classList.add("is-composing");
});

// IMEの入力終了イベント
edit.addEventListener("compositionend", (e) => {
  canvas.classList.remove("is-composing");
});

// テキスト更新イベント
edit.addEventListener("textupdate", (e) => {
  render();
});

// テキストフォーマット更新イベント
edit.addEventListener("textformatupdate", (e) => {
  render();
  // IME入力選択中のアンダーラインを引く
  const formats = e.getTextFormats();
  for (const format of formats) {
    const { rangeStart, rangeEnd, underlineStyle, underlineThickness } = format;
    const underlineXStart = measureTextWidth(edit.text.substring(0, rangeStart));
    const underlineXEnd = measureTextWidth(edit.text.substring(0, rangeEnd));
    const underlineY = TEXT_Y + 3;
    ctx.beginPath();
    ctx.moveTo(TEXT_X + underlineXStart, underlineY);
    ctx.lineTo(TEXT_X + underlineXEnd, underlineY);
    ctx.stroke();
  }
});

// 文字境界更新イベント
edit.addEventListener('characterboundsupdate', (e) => {
  // IMEダイアログの位置を設定する
  const charBounds = [];
  for (let offset = e.rangeStart; offset < e.rangeEnd; offset++) {
    charBounds.push(computeCharacterBound(offset));
  }
  edit.updateCharacterBounds(e.rangeStart, charBounds);
});
function computeCharacterBound(offset) {
  const widthBeforeChar = measureTextWidth(edit.text.substring(0, offset));
  const charWidth = measureTextWidth(edit.text[offset]);
  const charX = canvas.offsetLeft + widthBeforeChar;
  const charY = canvas.offsetTop;
  return DOMRect.fromRect({
    x: charX,
    y: charY + FONT_SIZE + 10,
    width: charWidth,
    height: FONT_SIZE,
  });
}

canvas.addEventListener("keydown", async (e) => {
  // Ctrl+VまたはCommand+Vでペースト処理
  if (e.key == "v" && (e.ctrlKey || e.metaKey)) {
    const pastedText = await navigator.clipboard.readText();
    // EditContextのテキストを更新
    edit.updateText(
      edit.selectionStart,
      edit.selectionEnd,
      pastedText,
    );
    // 選択範囲を更新
    edit.updateSelection(
      edit.selectionStart + pastedText.length,
      edit.selectionStart + pastedText.length,
    );
    render();
  }
  if (e.key == "ArrowLeft") {
    const prev_selection = edit.selectionStart;
    const newPosition = Math.max(prev_selection - 1, 0);
    if (e.shiftKey) {
        // 選択範囲指定は今回は実装しない
    } else {
      // Shiftキーが押されていない場合はカーソル位置を更新
      edit.updateSelection(newPosition, newPosition);
      breakTextCursor(prev_selection);
    }
  } else if (e.key == "ArrowRight") {
    const prev_selection = edit.selectionEnd;
    const newPosition = Math.min(prev_selection + 1, edit.text.length);
    if (e.shiftKey) {
        // 選択範囲指定は今回は実装しない
    } else {
      // Shiftキーが押されていない場合はカーソル位置を更新
      edit.updateSelection(newPosition, newPosition);
      breakTextCursor(prev_selection);
    }
  };
});
