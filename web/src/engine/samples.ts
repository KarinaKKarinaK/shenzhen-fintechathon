// The sample files in web/public/samples, with a one line description in both languages.
// selfcheck runs every runnable one through custom() and expects the malformed one to fail.

export interface Sample { file: string; kind: "json" | "csv"; runnable: boolean; en: string; zh: string }

export const SAMPLES: Sample[] = [
  { file: "jobs.json", kind: "json", runnable: true, en: "Five jobs with messages and a lease that reaches zero: decline, instalment, slash and title in one run.", zh: "五个任务，含消息和一份即将付清的租约：一次运行中看到拒绝、分期、罚没和所有权转移。" },
  { file: "jobs.csv", kind: "csv", runnable: true, en: "The same jobs as a plain CSV: job id, title, mu, price per mu, field, window, requester.", zh: "同样的任务，纯 CSV 格式：任务编号、标题、亩数、每亩单价、地块、时间窗口、委托人。" },
  { file: "flights.csv", kind: "csv", runnable: false, en: "Flight logs to upload next to jobs.csv as the 'flights' file; one of them is faked.", zh: "与 jobs.csv 一起上传的飞行日志（flights 字段），其中一份是伪造的。" },
  { file: "tampered-flight.json", kind: "json", runnable: true, en: "One honest job and one whose log claims three times the area the track covers: the fee is held.", zh: "一个诚实任务和一个日志声称面积是航迹三倍的任务：费用被冻结。" },
  { file: "messages-zh.json", kind: "json", runnable: true, en: "Chinese messages through the gate: a farmer's offer passes, a payee swap and an override are blocked.", zh: "中文消息经过门控：农户报价通过，篡改收款方和覆盖指令被拦截。" },
  { file: "malformed.json", kind: "json", runnable: false, en: "A bad file on purpose, to show the error message with its path and reason.", zh: "故意写错的文件，用来展示带路径和原因的错误提示。" },
];
