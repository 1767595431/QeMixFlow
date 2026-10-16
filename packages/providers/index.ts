/// <reference path="./types.d.ts" />

import deepSeek from "./src/language/deepSeek";
import qwen from "./src/language/qwen";
import volcengine from "./src/media/volcengine";
import jimeng from "./src/media/jimeng";
import kling from "./src/media/kling";

export type Provider = ProviderDefinition;
export type ProviderPrice = NonNullable<Awaited<ReturnType<NonNullable<Provider["getPrice"]>>>>;
export type ProviderPriceRequest = Parameters<NonNullable<Provider["getPrice"]>>[0];
export type ProviderPriceReference = NonNullable<ProviderPriceRequest["images"]>[number];
export type ProviderBalance = Awaited<ReturnType<NonNullable<Provider["getBalance"]>>>;
export type ProviderTools = ProviderContext["tool"];
export type AudioConvertOptions = Parameters<ProviderTools["audio"]["convert"]>[1];
export type { FfmpegFactory, FfmpegCommand } from "@toonflow/ffmpeg/types";

export const languageProviders = [deepSeek, qwen] as const;
export const mediaProviders = [volcengine, jimeng, kling] as const;
