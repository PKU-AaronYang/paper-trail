"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BRANCHES, TRIGRAMS, submissionRitual } from "@/lib/divination";
function Hexagram({ lines, moving }: { lines: number[]; moving?: number }) {
  return (
    <div
      className="hexagram"
      role="img"
      aria-label={lines
        .map((v, i) => `第${i + 1}爻${v ? "阳" : "阴"}${moving === i + 1 ? "动" : ""}`)
        .reverse()
        .join("，")}
    >
      {lines
        .map((v, i) => (
          <div key={i} className={`hex-line ${moving === i + 1 ? "hex-moving" : ""}`}>
            <span>{v ? "━━━━━━━━" : "━━━　━━━"}</span>
            <small>{moving === i + 1 ? "动爻" : ""}</small>
          </div>
        ))
        .reverse()}
    </div>
  );
}
export function SubmissionRitual({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<ReturnType<typeof submissionRitual> | null>(null);
  const [error, setError] = useState("");
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <DialogContent className="share-dialog">
        <DialogTitle>卜卦·投稿时间</DialogTitle>
        <DialogDescription>
          传统文化体验，仅供娱乐参考，不预测审稿或录用结果。请优先遵守真实截止日期和投稿准备情况。
        </DialogDescription>
        <label className="form-field">
          所问事项：论文题目或摘要
          <Textarea
            value={topic}
            maxLength={10000}
            onChange={(e) => {
              setTopic(e.target.value);
              setResult(null);
              setError("");
            }}
            placeholder="可填写中文或英文题目 / 摘要"
          />
        </label>
        <p className="subtle">
          题目或摘要会在本地提取有限的主题/方法词，并参与本次卦数计算；不会上传或写入论文记录。同一文本和同一时刻可复算相同结果。
        </p>
        <Button
          disabled={!topic.trim()}
          onClick={() => {
            try {
              setResult(submissionRitual(topic));
              setError("");
            } catch (e) {
              setResult(null);
              setError(e instanceof Error ? e.message : "起卦失败");
            }
          }}
        >
          根据题目与当前时间起卦
        </Button>
        {error && <p role="alert">{error}</p>}
        {result && (
          <div className="ritual-result">
            <section className="event-box">
              <p className="eyebrow">未来七天 · 趣味参考时段</p>
              <h3>
                {result.date} {String(result.hour).padStart(2, "0")}:00（北京时间 UTC+8）
              </h3>
              <p>{result.reminder}</p>
              <p className="subtle">
                识别主题：
                {result.analysis.topics.map((x) => x.label).join("、") || "暂未匹配明确主题"}；
                方法：
                {result.analysis.methods.map((x) => x.label).join("、") || "暂未匹配明确方法词"}
              </p>
              <p className="subtle">
                这个时段由下方公开的自定义映射选出，不是古法认定的“最佳投稿时间”。不计算录用概率、吉凶评分，也不会自动修改截止日期。
              </p>
            </section>
            <p className="subtle">
              起卦时间：{result.lunar.civilDate} {result.lunar.clock}（北京时间）
              <br />
              农历 {result.lunar.lunarYear} 年 · {result.lunar.leap ? "闰" : ""}
              {result.lunar.month} 月 {result.lunar.day} 日 ·{" "}
              {BRANCHES[result.lunar.yearNumber - 1]}年 · {BRANCHES[result.lunar.hourNumber - 1]}时
            </p>
            <div className="hex-pair">
              <section>
                <h3>
                  本卦：上{TRIGRAMS[result.hex.upper - 1].name}下
                  {TRIGRAMS[result.hex.lower - 1].name}
                </h3>
                <Hexagram lines={result.hex.original} moving={result.hex.moving} />
              </section>
              <section>
                <h3>
                  变卦：上{result.hex.changedUpper}下{result.hex.changedLower}
                </h3>
                <Hexagram lines={result.hex.changed} />
              </section>
            </div>
            <details>
              <summary>查看文本分析、传统起卦过程和现代择时规则</summary>
              <div className="usage-guide">
                <section>
                  <h3>题目 / 摘要分析</h3>
                  <p>
                    本地仅按预设的中英文主题词和方法词做可解释匹配。本次匹配到的词：
                    {result.analysis.topics
                      .flatMap((x) => x.hits)
                      .concat(result.analysis.methods.flatMap((x) => x.hits))
                      .join("、") || "无"}
                    。 未匹配时不会猜测研究领域。
                  </p>
                  <p>
                    文本经统一大小写、Unicode
                    形式和空白后生成指纹；指纹参与上卦、下卦、动爻及七日时段选择。因此题目内容确实影响结果，但这仍是本地趣味规则，不是语义模型或科学预测。
                  </p>
                </section>
                <section>
                  <h3>本工具的文本与时间取数</h3>
                  <p>
                    年支取 {result.lunar.yearNumber}，农历月取 {result.lunar.month}，日取{" "}
                    {result.lunar.day}，时支取 {result.lunar.hourNumber}。
                  </p>
                  <p>
                    题目指纹 F = {result.analysis.fingerprint}。上卦 =（F + 年支 + 月）除 8 的余数 +
                    1 = {result.hex.upper}； 下卦 =（F 除 8 向下取整 + 日 + 时支）除 8 的余数 + 1 ={" "}
                    {result.hex.lower}； 动爻 =（F 除 64 向下取整 + 日 + 时支）除 6 的余数 + 1 ={" "}
                    {result.hex.moving}。 这是现代取数规则，爻从下往上数。
                  </p>
                  <p>卦数：乾1、兑2、离3、震4、巽5、坎6、艮7、坤8。动爻阴阳互换得到变卦。</p>
                </section>
                <section>
                  <h3>网站自定义的七日映射</h3>
                  <p>
                    间隔天数 =（F + 上卦 + 下卦 + 动爻）除 7 的余数 + 1 = {result.offset} 天。 （F +
                    动爻）除 5 的余数为 0、1、2、3、4 时，分别对应 09、11、13、15、17 时。本次取{" "}
                    {result.hour}:00。
                  </p>
                  <p>
                    范围是起卦日期之后的七个自然日，不含今天；这个映射和上面的投稿提醒是现代趣味设计，未声称出自古籍。候选时段有限，不同题目也可能恰好得到同一时段。
                  </p>
                </section>
              </div>
            </details>
          </div>
        )}
        <details>
          <summary>规则来源与历法约定</summary>
          <p className="subtle">
            八卦序数与动爻阴阳互换参考《梅花易数》卷一；文本指纹取数及七日映射为本工具自定义，不属于传统年月日时起卦法。文本指纹按
            Unicode 码点迭代计算 32 位
            FNV-1a。本工具采用北京时间、农历春节换年、民用午夜换日；23:00–00:59
            取子时，闰月沿用该月序数。午夜换日、闰月处理和七日映射均为本工具明确采用的实现约定，不涵盖其他流派、真太阳时或专业择日体系。
          </p>
          <a
            className="text-button"
            href="https://zh.wikisource.org/zh-hans/梅花易數/卷一#年月日时起例"
            target="_blank"
            rel="noopener noreferrer"
          >
            查看原文依据
          </a>
        </details>
      </DialogContent>
    </Dialog>
  );
}
