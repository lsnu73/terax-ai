import { getProviderIconKey } from "@/modules/ai/config";
import {
  BrainIcon,
  CpuIcon,
  DeepseekIcon,
  FlashIcon,
  GlobeIcon,
  PlugIcon,
  ServerStack01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

/**
 * Provider 图标由数据驱动：Provider 条目声明一个图标键，本注册表把它映射到
 * Hugeicons 组件。未知键回退为通用插头图标，因此新增 Provider
 * 永远不需要修改本文件。
 */
const ICONS: Record<string, typeof PlugIcon> = {
  brain: BrainIcon,
  cpu: CpuIcon,
  deepseek: DeepseekIcon,
  flash: FlashIcon,
  globe: GlobeIcon,
  server: ServerStack01Icon,
  plug: PlugIcon,
};

type Props = {
  provider: string;
  icon?: string;
  size?: number;
  className?: string;
};

export function ProviderIcon({ provider, icon, size = 14, className }: Props) {
  const key = icon || getProviderIconKey(provider);
  const Component = ICONS[key] ?? PlugIcon;
  return (
    <HugeiconsIcon
      icon={Component}
      size={size}
      strokeWidth={1.75}
      className={className}
    />
  );
}
