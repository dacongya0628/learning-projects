// fs 用来读取文件、判断文件是否存在、遍历目录。
import fs from "node:fs";
// path 用来安全地拼接路径、解析扩展名、拿目录名。
import path from "node:path";
// content 是我们刚刚抽到配置文件里的“扫描配置”。
// 扫哪些目录、支持哪些扩展名、忽略哪些目录，都会从这里读取。
import { content } from "./config.js";


/**
 * 递归收集所有“允许扫描”的文件
 * @param {*} entryPath 入口路径
 * @param {*} supportedExtensions 允许扫描的文件
 * @param {*} ignoredDirectories 需要忽略的文件
 * @param {*} filePaths 
 * @returns 
 */
function collectContentFiles(
    entryPath,
    supportedExtensions,
    ignoredDirectories,
    filePaths
) {
    // 如果配置的路径不存在，就直接结束。这样即使配置里写了某个暂时不存在的目录，也不会报错中断。
    if (!fs.existsSync(entryPath)) return;
    // path.basename 只取当前路径最后一段名字。例如 c:/project/node_modules 会拿到 node_modules。
    const directoryName = path.basename(entryPath);
    // 如果目录名在忽略列表里，就不再继续往下扫描。
    if (ignoredDirectories.has(directoryName)) return;
    // 先看看当前路径到底是文件还是目录。
    const stat = fs.statSync(entryPath);
    // 如果既不是文件也不是文件夹直接返回
    if (!stat.isFile() && !stat.isDirectory()) return;
    // 如果当前是文件，就只需要判断扩展名是否在允许列表里。
    if (stat.isFile()) {
        // path.extname 会拿到像 ".html" 这样的后缀，slice(1) 是为了去掉开头的点，toLowerCase() 是为了统一大小写。
        const extension = path.extname(entryPath).slice(1).toLowerCase();
        // 命中允许的扩展名后，就把这个文件加入待扫描列表。
        if (supportedExtensions.has(extension)) {
            filePaths.push(entryPath);
        }
        return;
    }
    // withFileTypes: true 会让我们直接拿到 Dirent 对象，这样递归处理目录内容时会更方便。
    const entries = fs.readdirSync(entryPath, { withFileTypes: true });
    // 递归处理
    for (const entry of entries) {
        collectContentFiles(
            path.join(entryPath, entry.name),
            supportedExtensions,
            ignoredDirectories,
            filePaths
        );
    }
}

/**
 * 把“纯注释行”替换成空行，避免注释对class提取造成影响
 * @param {*} source 文件内容
 */
function removeCommentOnlyLines(source) {
    const lines = source.split("\n");
    const cleanedLines = [];
    // 这两个状态用来记录当前是否正处于多行注释内部。
    let inBlockComment = false;
    let inHtmlComment = false;
    for (const line of lines) {
        // 去除首位多余空格
        const trimmedLine = line.trim();
        // 如果当前还在 JS 的多行注释里，这一整行就直接视为“不可参与 class 提取”。
        if (inBlockComment) {
            cleanedLines.push("");
            if (trimmedLine.includes("*/")) {
                inBlockComment = false;
            }
            continue;
        }
        // 如果当前还在 HTML 注释里，这一整行就直接视为“不可参与 class 提取”。
        if (inHtmlComment) {
            cleanedLines.push("");
            if (trimmedLine.includes("-->")) {
                inHtmlComment = false;
            }
            continue;
        }
        // 处理单行注释，直接替换为空行。
        if (trimmedLine.startsWith("//")) {
            cleanedLines.push("");
            continue;
        }
        // 处理HTMl多行注释（Html 里以<!--开始以-->结束）
        if (trimmedLine.startsWith("<!--")) {
            cleanedLines.push("");
            if (!trimmedLine.includes("-->")) {
                inHtmlComment = true;
            }
            continue;
        }
        // 处理Js多行注释（Js里以/*开始*/结束）
        if (trimmedLine.startsWith("/*")) {
            cleanedLines.push("");
            if (!trimmedLine.includes("*/")) {
                inBlockComment = true;
            }
            continue;
        }
        // 剩下的内容默认认为可能是真实源码，保留下来继续做 class 提取。
        cleanedLines.push(line);
    }
    return cleanedLines.join("\n");
}


// 正则表达式
const classPatterns = [
    // class="..."、class='...'、className="..."、className='...'
    /(?:class|className)\s*=\s*(["'`])([\s\S]*?)\1/g,
    // className={"..."}、className={'...'}
    /(?:class|className)\s*=\s*\{\s*(["'`])([\s\S]*?)\1\s*\}/g
];
/**
 * 提取所有 class / className 类名
 * @param {*} source 文件内容（处理注释后的）
 */
function extractClasses(source) {
    // 结果集
    const classes = [];
    // 这里会依次尝试前面定义好的每一条匹配规则。
    for (const pattern of classPatterns) {
        // 因为这些正则都带有 g 标记，所以在重复使用前，最好先把 lastIndex 重置为 0。
        pattern.lastIndex = 0;
        // matchAll 会把当前规则在整段源码中的所有命中都找出来。
        for (const match of source.matchAll(pattern)) {
            // match[2] 才是真正的 class 文本内容。
            const classText = match[2];
            // 一个属性里通常会写多个类名，按空白字符继续拆分成单个类名
            const classList = classText.split(/\s+/).filter(Boolean);
            // 把这一次命中的所有类名先加入结果数组。
            classes.push(...classList);
        }
    }
    // 返回最终结果
    return classes
}

export function scanClasses() {
    // 从 confi配置g.js 里的 content 读取路径和扩展名。用 Set 保存扩展名。这里支持扫描的文件类型
    const supportedExtensions = new Set(
        content.extensions.map((extension) => extension.toLowerCase())
    );

    // 从 confi配置g.js 里的 content 读取路径和扩展名。用 Set 保存扩展名。这里是忽略扫描的文件类型
    const ignoredDirectories = new Set(content.ignoredDirectories);

    // filePaths 用来保存最终真正需要读取内容的文件绝对路径。
    const filePaths = [];

    // content.paths 里可以配置多个入口目录，所以这里要逐个入口去收集文件。
    for (const configuredPath of content.paths) {
        // 先把配置里的相对路径转成绝对路径，
        // 避免受到当前执行目录变化的影响。
        // 例如配置里写的是 demo，最终会变成完整的绝对路径再参与扫描。
        const absolutePath = path.resolve(process.cwd(), configuredPath);
        // // 从这个入口开始，递归收集所有符合条件的文件。
        collectContentFiles(
            absolutePath,
            supportedExtensions,
            ignoredDirectories,
            filePaths
        );
    }

    // classes 用来保存最终拆出来的每一个类名。用Set去重，同一个类名可能在多个文件里重复出现很多次。
    const classes = new Set();
    // 接下来逐个读取已经收集好的文件。
    for (const filePath of filePaths) {
        // 读取命中的文件内容。统一按 utf8 文本读取
        const source = fs.readFileSync(filePath, "utf8");
        // 在真正提取 class 之前，先去掉“纯注释行”带来的干扰。
        const normalizedSource = removeCommentOnlyLines(source);
        // // 这里会匹配常见的 class 和 className 写法。
        const classList = extractClasses(normalizedSource);
        // 再把这些类名逐个加入 Set，完成去重。
        for (const className of classList) {
            classes.add(className);
        }
    }
    return [...classes];
}