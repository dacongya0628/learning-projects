/*
 * DOM 节点引用。
 * 页面只有三个需要 JS 操作的元素：背景 canvas、鼠标圆、中心标题文本。
 */

// 背景 canvas，所有随机字符都画在这个元素上。
const canvas = document.querySelector("#matrixCanvas");

// canvas 的 2D 绘图上下文；alpha: false 表示画布不需要透明通道，绘制更直接。
const ctx = canvas.getContext("2d", { alpha: false });

// 跟随鼠标移动的白色反色圆。
const cursor = document.querySelector(".cursor-orb");

// 中心标题中真正承载文字的 span，打字效果会不断更新它的 textContent。
const titleTarget = document.querySelector("#typedTitle");

/*
 * Canvas 字符墙配置。
 * 原站的背景不是下落式代码雨，而是固定网格上的字符随机闪烁。
 */

// 背景字符池；只使用 ASCII 字符，能稳定显示出“代码噪声墙”的感觉。
const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$&*()-_+=/[]{};:<>.,0123456789";

// 字符颜色池；颜色刻意压低亮度，让背景存在但不喧宾夺主。
const palette = ["#53514D", "#53514D", "#998f84"];

// 字符随机刷新的间隔，单位是毫秒；越小闪烁越频繁。
const tickMs = 50;

// canvas 中每个字符的字号，单位是 CSS 像素。
const fontSize = 16;

// 每个字符格子的横向间距。小于 fontSize 会让字符横向更密集。
const cellWidth = 10;

// 每个字符格子的纵向间距。大于 fontSize 会保留一点行距。
const cellHeight = 20;

/*
 * Canvas 运行时状态。
 * 这些变量会随着窗口尺寸和动画帧持续变化。
 */

// 字符格子列表，每个元素代表屏幕上的一个字符。
let cells = [];

// 当前 canvas 网格的列数和行数。
let grid = { columns: 0, rows: 0 };

// 当前视口宽度，单位是 CSS 像素。
let width = 0;

// 当前视口高度，单位是 CSS 像素。
let height = 0;

// 设备像素比，用于让高清屏上的 canvas 不发糊。
let dpr = 1;

// 上一次随机刷新字符的时间戳，用于控制 tickMs 节奏。
let lastTick = Date.now();

/*
 * 从字符池里随机取一个字符。
 * 返回值会直接作为某个格子的显示内容。
 */
function randomGlyph() {
  return glyphs[Math.floor(Math.random() * glyphs.length)];
}

/*
 * 从调色板里随机取一个颜色。
 * 返回值是 hex 字符串，例如 "#53514D"。
 */
function randomColor() {
  return palette[Math.floor(Math.random() * palette.length)];
}

/*
 * 把颜色字符串转成 { r, g, b }。
 * 支持 "#RGB"、"#RRGGBB" 和 "rgb(...)" 三种格式。
 * 颜色过渡时需要对 r/g/b 单独计算，所以要先做这个转换。
 */
function hexToRgb(color) {
  const rgbMatch = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i.exec(color);

  if (rgbMatch) {
    return {
      r: Number.parseInt(rgbMatch[1], 10),
      g: Number.parseInt(rgbMatch[2], 10),
      b: Number.parseInt(rgbMatch[3], 10)
    };
  }

  const normalized = color.replace(
    /^#?([\da-f])([\da-f])([\da-f])$/i,
    (_, r, g, b) => r + r + g + g + b + b
  );
  const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(normalized);

  if (!match) {
    return null;
  }

  return {
    r: Number.parseInt(match[1], 16),
    g: Number.parseInt(match[2], 16),
    b: Number.parseInt(match[3], 16)
  };
}

/*
 * 在两个 RGB 颜色之间做线性插值。
 * amount 为 0 时接近 from，为 1 时等于 to。
 * 返回值是可以直接赋给 canvas fillStyle 的 rgb(...) 字符串。
 */
function mixColor(from, to, amount) {
  return `rgb(${Math.round(from.r + (to.r - from.r) * amount)},${Math.round(
    from.g + (to.g - from.g) * amount
  )},${Math.round(from.b + (to.b - from.b) * amount)})`;
}

/*
 * 根据当前屏幕尺寸重新生成字符格子。
 * 每个格子 cell 的字段：
 * char: 当前显示的字符
 * color: 当前颜色
 * targetColor: 本轮要过渡到的目标颜色
 * colorProgress: 颜色过渡进度，范围是 0 到 1
 */
function resetCells() {
  grid = {
    columns: Math.ceil(width / cellWidth),
    rows: Math.ceil(height / cellHeight)
  };

  cells = Array.from({ length: grid.columns * grid.rows }, () => {
    const color = randomColor();

    return {
      char: randomGlyph(),
      color,
      targetColor: randomColor(),
      colorProgress: 1
    };
  });
}

/*
 * 调整 canvas 尺寸，并适配高清屏。
 * 真实画布尺寸使用 width * dpr，CSS 展示尺寸仍然使用 width。
 * 这样能避免高分屏上 canvas 被浏览器拉伸导致发虚。
 */
function resizeCanvas() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  resetCells();
  drawMatrix();
}

/*
 * 按当前 cells 数据重绘整张字符墙。
 * canvas 不像 DOM 那样自动更新，任何字符或颜色变化后都要重新绘制。
 */
function drawMatrix() {
  ctx.clearRect(0, 0, width, height);
  ctx.font = `${fontSize}px Menlo, Monaco, Consolas, monospace`;
  ctx.textBaseline = "top";

  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index];
    ctx.fillStyle = cell.color;
    ctx.fillText(
      cell.char,
      (index % grid.columns) * cellWidth,
      Math.floor(index / grid.columns) * cellHeight
    );
  }
}

/*
 * 随机刷新一小批格子，制造电子噪声感。
 * 这里只改数据，不负责动画主循环。
 * 每次刷新约 5% 的格子，避免整屏同时闪烁。
 */
function refreshCells() {
  if (cells.length === 0) {
    return;
  }

  const amount = Math.max(1, Math.floor(cells.length * 0.05));

  for (let index = 0; index < amount; index += 1) {
    const cell = cells[Math.floor(Math.random() * cells.length)];
    cell.char = randomGlyph();
    cell.targetColor = randomColor();
    cell.colorProgress = 0;
  }

  drawMatrix();
}

/*
 * 推进被刷新格子的颜色过渡。
 * refreshCells 决定哪些格子变化；
 * tweenCellColors 负责让这些格子从旧颜色逐渐靠近新颜色。
 */
function tweenCellColors() {
  let needsPaint = false;

  for (const cell of cells) {
    if (cell.colorProgress < 1) {
      cell.colorProgress = Math.min(1, cell.colorProgress + 0.05);
      const from = hexToRgb(cell.color);
      const to = hexToRgb(cell.targetColor);

      if (from && to) {
        cell.color = mixColor(from, to, cell.colorProgress);
        needsPaint = true;
      }
    }
  }

  if (needsPaint) {
    drawMatrix();
  }
}

/*
 * Canvas 背景动画主循环。
 * requestAnimationFrame 负责跟随浏览器刷新率执行。
 * tickMs 控制字符数据多久随机更新一次。
 */
function animateMatrix() {
  const now = Date.now();

  if (now - lastTick >= tickMs) {
    refreshCells();
    lastTick = now;
  }

  tweenCellColors();
  requestAnimationFrame(animateMatrix);
}

/*
 * 鼠标圆形使用“目标坐标 + 当前坐标”实现平滑跟随。
 * x/y 是圆当前显示位置；tx/ty 是鼠标真实位置。
 * renderCursor 会让 x/y 每帧靠近 tx/ty。
 */
const pointer = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  tx: window.innerWidth / 2,
  ty: window.innerHeight / 2
};

/*
 * 每一帧让圆形向鼠标真实位置靠近一点。
 * 0.22 是缓动系数，越大越贴手，越小拖尾越明显。
 */
function renderCursor() {
  pointer.x += (pointer.tx - pointer.x) * 0.22;
  pointer.y += (pointer.ty - pointer.y) * 0.22;
  cursor.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0) translate(-50%, -50%)`;
  requestAnimationFrame(renderCursor);
}

/*
 * 绑定鼠标事件，只记录目标坐标和显示状态。
 * DOM 移动统一交给 renderCursor，避免 pointermove 触发过多时直接操作样式。
 */
function bindCursor() {
  window.addEventListener("pointermove", (event) => {
    pointer.tx = event.clientX;
    pointer.ty = event.clientY;
    cursor.classList.add("is-visible");
  });

  window.addEventListener("pointerleave", () => {
    cursor.classList.remove("is-visible");
  });

  window.addEventListener("pointerdown", () => {
    cursor.classList.add("is-pressed");
  });

  window.addEventListener("pointerup", () => {
    cursor.classList.remove("is-pressed");
  });
}

/*
 * 中心标题打字效果。
 * 想改页面唯一文案，只需要改 text。
 * 每 78ms 多显示一个字符，直到完整显示。
 */
function typeTitle() {
  const text = "快乐的大葱鸭";
  let index = 0;

  const tick = () => {
    titleTarget.textContent = text.slice(0, index);
    index += 1;

    if (index <= text.length) {
      window.setTimeout(tick, 78);
    }
  };

  tick();
}

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
animateMatrix();
bindCursor();
renderCursor();
typeTitle();
