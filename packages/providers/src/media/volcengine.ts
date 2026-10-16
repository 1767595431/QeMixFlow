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
    field: "baseUrl" as const,
    title: "请求地址",
    value: "https://ark.cn-beijing.volces.com/api/v3",
    props: { placeholder: "https://ark.cn-beijing.volces.com/api/v3" },
  },
] as const;

const version = "2.0.0";

/** 平台只接受 URL 或 Base64，二进制先转成 data URL。 */
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

/** 视频为异步任务：提交后轮询到 succeeded 才返回地址。 */
async function pollVideo(context: ProviderContext, baseUrl: string, apiKey: string, taskId: string, signal: AbortSignal): Promise<string> {
  while (true) {
    const response = await context.tool.fetch(`${baseUrl}/contents/generations/tasks/${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal,
    });
    if (!response.ok) throw new Error(`查询任务失败：HTTP ${response.status}`);
    const data = await response.json() as { status?: string; content?: { video_url?: string }; error?: { message?: string } };
    if (data?.status === "succeeded") {
      const url = data.content?.video_url;
      if (!url) throw new Error("视频生成成功但未返回视频地址");
      return url;
    }
    if (data?.status === "failed") throw new Error(data?.error?.message || "视频生成失败");
    await wait(signal, 5000);
  }
}

export default {
  id: "volcengine",
  label: "火山引擎",
  version,
  readme: `火山引擎方舟（Ark）提供豆包系列图片与视频生成模型：Seedream 负责文生图与多图参考，Seedance 负责文生/图生视频。

在 [方舟控制台](https://console.volcengine.com/ark) 开通模型并创建 API Key 后填入；请求地址留空默认使用北京地域。`,
  rules,
  models: [
    {
      id: "doubao-seedream-5-0-pro",
      label: "Seedream 5.0 Pro",
      type: "image",
      mode: ["text", "singleImage", "multiReference"],
      imageSizes: ["1K", "1.5K", "2K"],
      imageRatios: ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"],
    },
    {
      id: "doubao-seedream-5-0-lite",
      label: "Seedream 5.0 Lite",
      type: "image",
      mode: ["text", "singleImage", "multiReference"],
      imageSizes: ["2K", "3K", "4K"],
      imageRatios: ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"],
    },
    {
      id: "doubao-seedream-4-0-250828",
      label: "Seedream 4.0",
      type: "image",
      mode: ["text", "singleImage", "multiReference"],
      imageSizes: ["1K", "2K", "4K"],
      imageRatios: ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"],
    },
    {
      id: "doubao-seedream-3-0-t2i-250415",
      label: "Seedream 3.0",
      type: "image",
      mode: ["text"],
      imageSizes: ["1K", "2K"],
      imageRatios: ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3"],
    },
    {
      id: "doubao-seededit-3-0-i2i-250628",
      label: "SeedEdit 3.0（图片编辑）",
      type: "image",
      mode: ["singleImage", "multiReference"],
      imageSizes: ["1K", "2K"],
      imageRatios: ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3"],
    },
    {
      id: "doubao-seedance-2-5-pro",
      label: "Seedance 2.5 Pro",
      type: "video",
      mode: ["text", "startFrameOptional", ["imageReference:30", "videoReference:10", "audioReference:10"]],
      audio: "optional",
      durationResolutionMap: [{ duration: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30], resolution: ["480p", "720p", "1080p"] }],
    },
    {
      id: "doubao-seedance-2-0-pro",
      label: "Seedance 2.0 Pro",
      type: "video",
      mode: ["text", "startFrameOptional", ["imageReference:9", "videoReference:3", "audioReference:3"]],
      audio: "optional",
      durationResolutionMap: [{ duration: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["480p", "720p"] }],
    },
    {
      id: "doubao-seedance-2-0-fast",
      label: "Seedance 2.0 fast",
      type: "video",
      mode: ["text", "startFrameOptional", ["imageReference:9", "videoReference:3", "audioReference:3"]],
      audio: "optional",
      durationResolutionMap: [{ duration: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["480p", "720p"] }],
    },
    {
      id: "doubao-seedance-2-0-mini",
      label: "Seedance 2.0 mini",
      type: "video",
      mode: ["text", "startFrameOptional", ["imageReference:9", "videoReference:3", "audioReference:3"]],
      audio: "optional",
      durationResolutionMap: [{ duration: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["480p", "720p"] }],
    },
    {
      id: "doubao-seedance-1-0-pro-250528",
      label: "Seedance 1.0 pro",
      type: "video",
      mode: ["text", "singleImage", "startFrameOptional", "endFrameOptional", "startEndRequired"],
      audio: false,
      durationResolutionMap: [{ duration: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12], resolution: ["480p", "720p", "1080p"] }],
    },
    {
      id: "doubao-seedance-1-0-lite-t2v-250428",
      label: "Seedance 1.0 lite（文生视频）",
      type: "video",
      mode: ["text"],
      audio: false,
      durationResolutionMap: [{ duration: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12], resolution: ["480p", "720p", "1080p"] }],
    },
    {
      id: "doubao-seedance-1-0-lite-i2v-250428",
      label: "Seedance 1.0 lite（图生视频）",
      type: "video",
      mode: ["singleImage", "startFrameOptional", "endFrameOptional", "startEndRequired"],
      audio: false,
      durationResolutionMap: [{ duration: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12], resolution: ["480p", "720p", "1080p"] }],
    },
  ] satisfies ProviderModel[],
  async generateImage(request: ImageRequest): Promise<MediaAsset[]> {
    const apiKey = this.config.apiKey?.trim();
    if (!apiKey) throw new Error("请填写 API Key");
    const baseUrl = (this.config.baseUrl?.trim() || "https://ark.cn-beijing.volces.com/api/v3").replace(/\/$/, "");

    const images = (request.images ?? []).map(mediaUrl);
    // ACT: 单张参考图传字符串，多张传数组；由平台按模型能力校验。
    const reference = images.length === 0 ? undefined : images.length === 1 ? images[0] : images;
    const body: Record<string, unknown> = {
      model: request.model,
      prompt: request.prompt,
      size: request.size ?? "2K",
      response_format: "url",
      watermark: false,
      sequential_image_generation: "disabled",
    };
    if (reference) body.image = reference;

    const signal = AbortSignal.any([AbortSignal.timeout(5 * 60_000), ...(this.signal ? [this.signal] : [])]);
    const response = await this.tool.fetch(`${baseUrl}/images/generations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
    const data = await response.json().catch(() => null) as { data?: { url?: string }[]; error?: { message?: string } } | null;
    if (!response.ok) throw new Error(data?.error?.message || `提交任务失败：HTTP ${response.status}`);
    const assets = (data?.data ?? []).flatMap(item => item?.url ? [{ mediaType: "image" as const, type: "url" as const, url: item.url }] : []);
    if (!assets.length) throw new Error("生成成功但未返回图片地址");
    return assets;
  },
  async generateVideo(request: VideoRequest): Promise<MediaAsset[]> {
    const apiKey = this.config.apiKey?.trim();
    if (!apiKey) throw new Error("请填写 API Key");
    const baseUrl = (this.config.baseUrl?.trim() || "https://ark.cn-beijing.volces.com/api/v3").replace(/\/$/, "");

    const images = (request.images ?? []).map(mediaUrl);
    const frames = [
      ...(request.firstFrame ? [{ url: mediaUrl(request.firstFrame), role: "first_frame" }] : []),
      ...(request.lastFrame ? [{ url: mediaUrl(request.lastFrame), role: "last_frame" }] : []),
    ];
    const frameImages = frames.length ? frames : images.map((url, index) => ({ url, role: index === 0 ? "first_frame" : "last_frame" }));

    // ACT: 生成参数以命令行后缀形式拼在提示词后，这是方舟视频接口的约定。
    const flags = [
      request.resolution ? ` --resolution ${request.resolution}` : "",
      request.ratio ? ` --ratio ${request.ratio}` : "",
      request.duration ? ` --duration ${request.duration}` : "",
      request.generateAudio ? " --audio true" : "",
      request.watermark === undefined ? "" : ` --watermark ${request.watermark}`,
    ].join("");
    const content: Record<string, unknown>[] = [{ type: "text", text: `${request.prompt}${flags}` }];
    frameImages.forEach(item => content.push({ type: "image_url", image_url: { url: item.url }, role: item.role }));

    const signal = AbortSignal.any([AbortSignal.timeout(15 * 60_000), ...(this.signal ? [this.signal] : [])]);
    const submitResponse = await this.tool.fetch(`${baseUrl}/contents/generations/tasks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: request.model, content }),
      signal,
    });
    const submitData = await submitResponse.json().catch(() => null) as { id?: string; error?: { message?: string } } | null;
    if (!submitResponse.ok) throw new Error(submitData?.error?.message || `提交任务失败：HTTP ${submitResponse.status}`);
    const taskId = submitData?.id;
    if (!taskId) throw new Error("提交任务未返回任务 ID");

    const videoUrl = await pollVideo(this, baseUrl, apiKey, taskId, signal);
    return [{ mediaType: "video", type: "url", url: videoUrl }];
  },
} satisfies ProviderDefinition<typeof rules>;
