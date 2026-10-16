const rules = [
  {
    type: "input",
    field: "apiKey" as const,
    title: "API Key",
    value: "",
    props: { type: "password", showPassword: true, autocomplete: "off" },
  },
  {
    type: "input",
    field: "apiUrl" as const,
    title: "请求地址",
    value: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    props: { placeholder: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  },
];

export default {
  id: "qwen" as const,
  label: "通义千问",
  version: "2.0.0",
  apiUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  protocol: "openai-completions",
  readme: "阿里云百炼（DashScope）提供的通义千问系列文本模型，使用 OpenAI 兼容协议。\n\n在 [阿里云百炼控制台](https://bailian.console.aliyun.com/) 创建 API Key 后填入。",
  rules,
  models: [],
} satisfies ProviderDefinition<typeof rules>;
