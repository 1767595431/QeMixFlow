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
    value: "https://visual.volcengineapi.com",
    props: { placeholder: "https://visual.volcengineapi.com" },
  },
] as const;

const version = "2.0.0";
const service = "cv";
const region = "cn-north-1";
const apiVersion = "2022-08-31";

function hex(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("hex");
}

function sha256Hex(value: string) {
  return hex(new Uint8Array(new Bun.CryptoHasher("sha256").update(value).digest()));
}

function hmac(key: string | Uint8Array, value: string) {
  return new Uint8Array(new Bun.CryptoHasher("sha256", key).update(value).digest());
}

/** 火山引擎签名 V4：先派生日期/地域/服务三级密钥，再对规范化请求签名。 */
function sign(accessKey: string, secretKey: string, host: string, action: string, body: string) {
  const xDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  const shortDate = xDate.slice(0, 8);
  const contentType = "application/json";
  const payloadHash = sha256Hex(body);
  const query = `Action=${action}&Version=${apiVersion}`;
  const canonicalHeaders = `content-type:${contentType}\nx-content-sha256:${payloadHash}\nhost:${host}\nx-date:${xDate}\n`;
  const signedHeaders = "content-type;x-content-sha256;host;x-date";
  const canonicalRequest = ["POST", "/", query, canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const credentialScope = `${shortDate}/${region}/${service}/request`;
  const stringToSign = ["HMAC-SHA256", xDate, credentialScope, sha256Hex(canonicalRequest)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(secretKey, shortDate), region), service), "request");
  const signature = hex(hmac(signingKey, stringToSign));
  return {
    url: `https://${host}/?${query}`,
    headers: {
      "Content-Type": contentType,
      "X-Date": xDate,
      "X-Content-Sha256": payloadHash,
      Host: host,
      Authorization: `HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    } as Record<string, string>,
  };
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

/** 平台只接受 URL 或 Base64，二进制转成 data URL。 */
function mediaUrl(input: MediaInput) {
  if (input.type === "url") return input.url;
  const data = input.type === "binary" ? Buffer.from(input.data).toString("base64") : input.data;
  return data.startsWith("data:") ? data : `data:${input.mimeType};base64,${data}`;
}

type VisualResponse = {
  code?: number;
  message?: string;
  data?: { task_id?: string; status?: string; image_urls?: string[]; video_url?: string; binary_data_base64?: string[] };
};

async function call(context: ProviderContext, signed: { url: string; headers: Record<string, string> }, body: string, signal: AbortSignal) {
  const response = await context.tool.fetch(signed.url, { method: "POST", headers: signed.headers, body, signal });
  const data = await response.json().catch(() => null) as VisualResponse | null;
  if (!response.ok) throw new Error(data?.message || `请求失败：HTTP ${response.status}`);
  // ACT: 火山视觉接口用 code=10000 表示成功。
  if (typeof data?.code === "number" && data.code !== 10000) throw new Error(data.message || `接口返回错误码 ${data.code}`);
  return data;
}

function readConfig(instance: { config: Record<string, unknown> }) {
  const accessKey = (instance.config.accessKey as string | undefined)?.trim();
  const secretKey = (instance.config.secretKey as string | undefined)?.trim();
  if (!accessKey || !secretKey) throw new Error("请填写 Access Key 与 Secret Key");
  const host = ((instance.config.baseUrl as string | undefined)?.trim() || "https://visual.volcengineapi.com")
    .replace(/^https?:\/\//, "").replace(/\/$/, "");
  return { accessKey, secretKey, host };
}

export default {
  id: "jimeng",
  label: "即梦",
  version,
  readme: `字节跳动即梦 AI（火山引擎视觉智能平台）提供图片与视频生成：图片走 CVProcess 同步接口，视频走 CVSync2Async 异步任务。

在 [火山引擎视觉智能控制台](https://console.volcengine.com/vision) 开通「即梦AI」相关能力，创建 AK/SK 后填入。模型 ID 就是平台的服务标识（req_key），需与你已开通的服务一致。`,
  rules,
  models: [
    {
      id: "jimeng_high_aes_general_v30",
      label: "即梦图片 3.0",
      type: "image",
      mode: ["text"],
      imageSizes: ["1K", "2K"],
      imageRatios: ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"],
    },
    {
      id: "jimeng_high_aes_general_v21_L",
      label: "即梦图片 2.1",
      type: "image",
      mode: ["text"],
      imageSizes: ["1K", "2K"],
      imageRatios: ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3", "21:9"],
    },
    {
      id: "jimeng_t2v_v30",
      label: "即梦视频 3.0（文生视频）",
      type: "video",
      mode: ["text"],
      audio: false,
      durationResolutionMap: [{ duration: [5, 10], resolution: ["720p", "1080p"] }],
    },
    {
      id: "jimeng_i2v_v30_first_frame",
      label: "即梦视频 3.0（图生视频·首帧）",
      type: "video",
      mode: ["singleImage", "startFrameOptional"],
      audio: false,
      durationResolutionMap: [{ duration: [5, 10], resolution: ["720p", "1080p"] }],
    },
    {
      id: "jimeng_i2v_v30_first_last",
      label: "即梦视频 3.0（图生视频·首尾帧）",
      type: "video",
      mode: ["startFrameOptional", "endFrameOptional", "startEndRequired"],
      audio: false,
      durationResolutionMap: [{ duration: [5, 10], resolution: ["720p", "1080p"] }],
    },
  ] satisfies ProviderModel[],
  async generateImage(request: ImageRequest): Promise<MediaAsset[]> {
    const { accessKey, secretKey, host } = readConfig(this);
    const payload: Record<string, unknown> = {
      req_key: request.model,
      prompt: request.prompt,
      return_url: true,
      use_pre_llm: true,
    };
    if (request.size) payload.size = request.size;
    if (request.ratio) payload.aspect_ratio = request.ratio;
    const body = JSON.stringify(payload);
    const signal = AbortSignal.any([AbortSignal.timeout(10 * 60_000), ...(this.signal ? [this.signal] : [])]);
    const data = await call(this, sign(accessKey, secretKey, host, "CVProcess", body), body, signal);

    const urls = data?.data?.image_urls ?? [];
    const base64 = data?.data?.binary_data_base64 ?? [];
    const assets: MediaAsset[] = [
      ...urls.map(url => ({ mediaType: "image" as const, type: "url" as const, url })),
      ...base64.map(item => ({ mediaType: "image" as const, type: "base64" as const, data: item, mimeType: "image/png" })),
    ];
    if (!assets.length) throw new Error("生成成功但未返回图片数据");
    return assets;
  },
  async generateVideo(request: VideoRequest): Promise<MediaAsset[]> {
    const { accessKey, secretKey, host } = readConfig(this);
    const payload: Record<string, unknown> = { req_key: request.model, prompt: request.prompt };
    const first = request.firstFrame ? mediaUrl(request.firstFrame) : (request.images ?? []).map(mediaUrl)[0];
    const last = request.lastFrame ? mediaUrl(request.lastFrame) : undefined;
    if (first) payload.image_urls = last ? [first, last] : [first];
    if (request.ratio) payload.aspect_ratio = request.ratio;
    if (request.duration) payload.duration = request.duration;

    const signal = AbortSignal.any([AbortSignal.timeout(15 * 60_000), ...(this.signal ? [this.signal] : [])]);
    const submitBody = JSON.stringify(payload);
    const submit = await call(this, sign(accessKey, secretKey, host, "CVSync2AsyncSubmitTask", submitBody), submitBody, signal);
    const taskId = submit?.data?.task_id;
    if (!taskId) throw new Error("提交任务未返回任务 ID");

    while (true) {
      const queryBody = JSON.stringify({ req_key: request.model, task_id: taskId, req_json: JSON.stringify({ return_url: true }) });
      const result = await call(this, sign(accessKey, secretKey, host, "CVSync2AsyncGetResult", queryBody), queryBody, signal);
      const status = result?.data?.status;
      if (status === "done" || status === "succeeded") {
        const url = result?.data?.video_url;
        if (!url) throw new Error("生成成功但未返回视频地址");
        return [{ mediaType: "video", type: "url", url }];
      }
      if (status === "failed" || status === "not_found") throw new Error(result?.message || "视频生成失败");
      await wait(signal, 5000);
    }
  },
} satisfies ProviderDefinition<typeof rules>;
