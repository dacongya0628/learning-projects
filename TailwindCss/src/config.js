// 统一大小token (字体,间距)
export const commonSizeToken = {
    generateTokens: function (max = 100) {
        // 这里的 this 指向 commonSizeToken
        for (let i = 0; i < max; i++) {
            commonSizeToken[i] = `${i}px`;
        }
    }
}

commonSizeToken.generateTokens();

// 统一颜色值token (字体颜色,背景颜色)
export const commonColorTokes = {
    white: "white",
    black: "black",
    gray: "gray",
    red: "red",
    blue: "blue",
    green: "green"
}
// 行间距token
export const LHTokens = {
    'x0': 0,
    'x1': 1,
    'x1-1': 1.1,
    'x1-2': 1.2,
    'x2': 2
}

// 媒体查询字典
export const mediaQueryEnum = {
    sm: "640px",
    md: '768px',
    lg: '1024px',
    xl: '1280px',
}

// css 属性前缀字典
export const cssPrefixEnum = {
    p: ["padding"],
    px: ["padding-left", "padding-right"],
    py: ["padding-top", "padding-bottom"],
    pt: ["padding-top"],
    pr: ["padding-right"],
    pb: ["padding-bottom"],
    pl: ["padding-left"],
    m: ["margin"],
    mx: ["margin-left", "margin-right"],
    my: ["margin-top", "margin-bottom"],
    mt: ["margin-top"],
    mr: ["margin-right"],
    mb: ["margin-bottom"],
    ml: ["margin-left"],
    fs: ["font-size"],
    bgC: ["background-color"],
    lh: ["line-height"],
    c: ["color"]
};

// 配置扫描路径
export const content = {
    // paths 表示要从哪些目录或文件开始扫描。
    // 这里先扫描 demo 和 src，已经够覆盖当前这个小项目。
    paths: ["demo"],
    // extensions 表示哪些扩展名的文件值得读取。
    extensions: [
        "html",
        "js",
        "jsx",
        "mjs",
        "cjs",
        "ts",
        "tsx",
        "vue",
        "svelte",
        "astro",
        "mdx"
    ],
    // ignoredDirectories 表示哪些目录即使存在，也不要进去扫描。
    ignoredDirectories: ["dist", "node_modules", ".git"]
};