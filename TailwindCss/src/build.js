// fs 用来创建目录、写文件。
import fs from "node:fs";
// path 用来拼接和解析文件路径。
import path from "node:path";
// scanClasses 负责从源码文件中收集所有出现过的类名。
import { scanClasses } from "./scanClasses.js";
// generateCss 负责把扫描出来的类名列表转换成构建结果。
import { generateCss } from "./generateCss.js";

// 第一步:调用扫描器，得到项目里出现过的类名数组。
// 这里的结果会作为后续生成 CSS 的输入。
const classes = scanClasses();
// 第二步:生成Css规则
const { css, unsupportedClassNames } = generateCss(classes)

// 第三步：约定输出位置。
const outputDir = path.resolve(process.cwd(), "dist");
const outputFile = path.join(outputDir, "index.css");
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, css, "utf8");

// 如果存在未支持的class则同步输出
if (unsupportedClassNames.length > 0) {
    console.warn("[mini-tailwind] 以下类名暂未支持：");

    for (const className of unsupportedClassNames) {
        console.warn(`- ${className}`);
    }
}
