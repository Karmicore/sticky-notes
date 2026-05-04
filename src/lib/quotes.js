import { getLocale } from "./locale";

const zh = [
  "今日份的认真，值得被记住",
  "每一条完成的待办，都是对自己的交代",
  "把事情做完的感觉，真好",
  "一天一天，积少成多",
  "完成比完美更重要",
  "今天的努力，明天的底气",
  "日拱一卒，功不唐捐",
  "今日事今日毕",
  "能管理好待办的人，也能管理好生活",
  "你的执行力，已经超越了大多数人",
  "清单上的每一笔，都是生活的掌控感",
  "小事做好，大事自来",
  "认真的人，运气都不会太差",
  "便签虽小，承载的是你的行动力",
  "做一件事就认真做一件事",
  "比起昨天的你，今天又进步了一点",
  "这些被划掉的任务，就是你今天的勋章",
  "又搞定了几件事，给自己点个赞",
  "你不是在写便签，你是在管理人生",
  "一步一步来，反正你已经在路上了",
];

const en = [
  "Done is better than perfect",
  "Small steps still move you forward",
  "Your to-do list doesn't stand a chance",
  "Another day, another win",
  "Progress, not perfection",
  "You showed up. That matters.",
  "Checked off and crushing it",
  "The secret of getting ahead is getting started",
  "One task at a time. You've got this.",
  "Productivity looks good on you",
  "Every checked box is a tiny victory",
  "You're not just making lists, you're making progress",
  "The grind is quiet. The results are loud.",
  "Focus on progress, not perfection",
  "A little progress each day adds up to big results",
  "You did the thing. Celebrate that.",
  "Discipline is choosing what you want most over what you want now",
  "Stay consistent. Trust the process.",
  "Action is the foundational key to all success",
  "Today's effort is tomorrow's success",
];

export function getRandomQuote() {
  const locale = getLocale();
  const list = locale === "zh" ? zh : en;
  return list[Math.floor(Math.random() * list.length)];
}
