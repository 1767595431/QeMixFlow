const rules = [
  {
    type: "input",
    field: "accessKey" as const,
    title: "Access Key",
    value: "",
    props: { autocomplete: "off" },
  },
  {
    type: "input",
    field: "secretKey" as const,
    title: "Secret Key",
    value: "",
    props: { type: "password", showPassword: true, autocomplete: "off" },
  },
  {
    type: "input",
    field: "baseUrl" as const,
    title: "请求地址",
    value: "https://api-beijing.klingai.com",
    props: { placeholder: "https://api-beijing.klingai.com" },
  },
] as const;

const version = "2.0.0";

function base64Url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** 可灵用 AK/SK 现场签发 HS256 JWT，有效期 30 分钟。 */
function signToken(accessKey: string, secretKey: string) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = base64Url(Buffer.from(JSON.stringify({ iss: accessKey, exp: now + 1800, nbf: now - 5 })));
  const content = `${header}.${payload}`;
  const signature = base64Url(new Uint8Array(new Bun.CryptoHasher("sha256", secretKey).update(content).digest()));
  return `${content}.${signature}`;
}

/** 平台只接受 URL，二进制与 Base64 先转成 data URL。 */
function mediaUrl(input: MediaInput) {
  if (input.type === "url") return input.url;
  const data = input.type === "binary" ? Buffer.from(input.data).toString("base64") : input.data;
  return data.startsWith("data:") ? data : `data:${input.mimeType};base64,${data}`;
}

function wait(signal: AbortSignal, ms: number) {
  signal.throwIfAborted();
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}

type TaskResponse = {
  code?: number;
  message?: string;
  data?: {
    task_id?: string;
    task_status?: string;
    task_status_msg?: string;
    task_result?: { images?: { url?: string }[]; videos?: { url?: string }[] };
  };
};

async function requestTask(context: ProviderContext, url: string, token: string, signal: AbortSignal, body?: unknown) {
  const response = await context.tool.fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal,
  });
  const data = await response.json().catch(() => null) as TaskResponse | null;
  if (!response.ok || (typeof data?.code === "number" && data.code !== 0))
    throw new Error(data?.message || `请求失败：HTTP ${response.status}`);
  return data;
}

async function pollTask(context: ProviderContext, url: string, token: string, signal: AbortSignal, kind: "images" | "videos"): Promise<string> {
  while (true) {
    const data = await requestTask(context, url, token, signal);
    const status = data?.data?.task_status;
    if (status === "succeed") {
      const items = kind === "images" ? data?.data?.task_result?.images : data?.data?.task_result?.videos;
      const url2 = items?.[0]?.url;
      if (!url2) throw new Error("生成成功但未返回地址");
      return url2;
    }
    if (status === "failed") throw new Error(data?.data?.task_status_msg || "生成失败");
    await wait(signal, 5000);
  }
}

export default {
  id: "kling",
  label: "可灵",
  version,
  readme: `快手可灵（Kling）提供图片与视频生成能力：可灵图片支持文生图，可灵视频支持文生视频与图生视频（含首尾帧）。

在 [可灵开放平台](https://app.klingai.com/cn/dev) 创建应用后获取 Access Key 与 Secret Key 填入。`,
  rules,
  models: [
    {
      id: "kling-v2-1",
      label: "可灵图片 v2.1",
      type: "image",
      mode: ["text"],
      imageRatios: ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"],
    },
    {
      id: "kling-v2",
      label: "可灵图片 v2",
      type: "image",
      mode: ["text"],
      imageRatios: ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"],
    },
    {
      id: "kling-v1-5",
      label: "可灵图片 v1.5",
      type: "image",
      mode: ["text"],
      imageRatios: ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"],
    },
    {
      id: "kling-v1",
      label: "可灵图片 v1",
      type: "image",
      mode: ["text"],
      imageRatios: ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"],
    },
    {
      id: "kling-v2-1-master",
      label: "可灵 v2.1 大师版",
      type: "video",
      mode: ["text", "singleImage", "startFrameOptional", "endFrameOptional"],
      audio: false,
      durationResolutionMap: [{ duration: [5, 10], resolution: ["720p", "1080p"] }],
    },
    {
      id: "kling-v2-master",
      label: "可灵 v2 大师版",
      type: "video",
      mode: ["text", "singleImage"],
      audio: false,
      durationResolutionMap: [{ duration: [5, 10], resolution: ["720p", "1080p"] }],
    },
    {
      id: "kling-v1-6",
      label: "可灵 v1.6",
      type: "video",
      mode: ["text", "singleImage"],
      audio: false,
      durationResolutionMap: [{ duration: [5, 10], resolution: ["720p", "1080p"] }],
    },
  ] satisfies ProviderModel[],
  async generateImage(request: ImageRequest): Promise<MediaAsset[]> {
    const accessKey = this.config.accessKey?.trim();
    const secretKey = this.config.secretKey?.trim();
    if (!accessKey || !secretKey) throw new Error("请填写 Access Key 与 Secret Key");
    const baseUrl = (this.config.baseUrl?.trim() || "https://api-beijing.klingai.com").replace(/\/$/, "");
    const token = signToken(accessKey, secretKey);
    const signal = AbortSignal.any([AbortSignal.timeout(10 * 60_000), ...(this.signal ? [this.signal] : [])]);

    const submit = await requestTask(this, `${baseUrl}/v1/images/generations`, token, signal, {
      model_name: request.model,
      prompt: request.prompt,
      ...(request.ratio ? { aspect_ratio: request.ratio } : {}),
      n: request.n ?? 1,
    });
    const taskId = submit?.data?.task_id;
    if (!taskId) throw new Error("提交任务未返回任务 ID");
    const url = await pollTask(this, `${baseUrl}/v1/images/generations/${encodeURIComponent(taskId)}`, token, signal, "images");
    return [{ mediaType: "image", type: "url", url }];
  },
  async generateVideo(request: VideoRequest): Promise<MediaAsset[]> {
    const accessKey = this.config.accessKey?.trim();
    const secretKey = this.config.secretKey?.trim();
    if (!accessKey || !secretKey) throw new Error("请填写 Access Key 与 Secret Key");
    const baseUrl = (this.config.baseUrl?.trim() || "https://api-beijing.klingai.com").replace(/\/$/, "");
    const token = signToken(accessKey, secretKey);

    const images = (request.images ?? []).map(mediaUrl);
    const first = request.firstFrame ? mediaUrl(request.firstFrame) : images[0];
    const last = request.lastFrame ? mediaUrl(request.lastFrame) : undefined;
    // ACT: 有图走 image2video，纯文本走 text2video；首尾帧分别映射 image 与 image_tail。
    const withImage = Boolean(first);
    const path = withImage ? "image2video" : "text2video";
    const body: Record<string, unknown> = {
      model_name: request.model,
      prompt: request.prompt,
      ...(request.duration ? { duration: String(request.duration) } : {}),
      ...(request.ratio ? { aspect_ratio: request.ratio } : {}),
    };
    if (withImage) {
      body.image = first;
      if (last) body.image_tail = last;
    }

    const signal = AbortSignal.any([AbortSignal.timeout(15 * 60_000), ...(this.signal ? [this.signal] : [])]);
    const submit = await requestTask(this, `${baseUrl}/v1/videos/${path}`, token, signal, body);
    const taskId = submit?.data?.task_id;
    if (!taskId) throw new Error("提交任务未返回任务 ID");
    const url = await pollTask(this, `${baseUrl}/v1/videos/${path}/${encodeURIComponent(taskId)}`, token, signal, "videos");
    return [{ mediaType: "video", type: "url", url }];
  },
} satisfies ProviderDefinition<typeof rules>;
