import { useRef, useState } from "react";
import Avatar from "react-nice-avatar";
import { cn, getRuntimeIconComponent } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { Camera01Icon, Robot02Icon } from "@hugeicons/core-free-icons";
import type { RuntimeProfile } from "@/lib/types";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { decodeNiceAvatar } from "@/lib/avatar";
import { upload } from "@/paraglide/messages";

interface AvatarUploadProps {
  agentId: string;
  avatarUrl?: string;
  name: string;
  runtimeId?: string;
  runtime?: Pick<RuntimeProfile, "id" | "name" | "command" | "registryId">;
  size?: "sm" | "md" | "lg";
  onUploaded?: (avatarUrl: string) => void;
  disableHover?: boolean;
}

const sizeMap = {
  sm: "size-7",
  md: "size-12",
  lg: "size-20",
};

const iconSizeMap = {
  sm: "size-3",
  md: "size-4",
  lg: "size-5",
};

export function AvatarUpload({
  agentId,
  avatarUrl,
  name,
  runtimeId,
  runtime,
  size = "md",
  onUploaded,
  disableHover,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) return;

    setUploading(true);
    try {
      console.warn("Avatar upload is not implemented yet.", { agentId, fileName: file.name });
      onUploaded?.(avatarUrl || "");
    } catch (err) {
      console.error("Failed to upload avatar:", err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const RuntimeIcon = getRuntimeIconComponent({
    id: runtime?.registryId || runtime?.id || runtimeId,
    name: runtime?.name || name,
    command: runtime?.command,
  });
  const niceAvatarConfig = decodeNiceAvatar(avatarUrl);

  return (
    <Tooltip>
      <TooltipTrigger
        render={(props) => (
          <button
            {...props}
            type="button"
            onClick={() => inputRef.current?.click()}
            className={cn(
              "group relative shrink-0 rounded-lg overflow-hidden transition-opacity",
              sizeMap[size],
              !avatarUrl && "bg-primary/10 flex items-center justify-center",
              uploading && "opacity-60 cursor-wait",
              !uploading && "cursor-pointer",
            )}
            disabled={uploading}
          >
            {niceAvatarConfig ? (
              <Avatar className="size-full" {...niceAvatarConfig} />
            ) : avatarUrl ? (
              <img src={avatarUrl} alt={name} className="size-full object-cover" />
            ) : RuntimeIcon ? (
              <HugeiconsIcon icon={RuntimeIcon} className={cn("text-primary/70", iconSizeMap[size])} />
            ) : (
              <HugeiconsIcon icon={Robot02Icon} className={cn("text-primary/70", iconSizeMap[size])} />
            )}

            {!disableHover && (
              <div
                className={cn(
                  "absolute inset-0 flex items-center justify-center bg-foreground/40 opacity-0 transition-opacity",
                  !uploading && "group-hover:opacity-100",
                  uploading && "opacity-100",
                )}
              >
                {uploading ? (
                  <Spinner size="sm" className="text-background" />
                ) : (
                  <HugeiconsIcon icon={Camera01Icon} className={cn(iconSizeMap[size], "text-background")} />
                )}
              </div>
            )}
            {disableHover && uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-foreground/40">
                <Spinner size="sm" className="text-background" />
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </button>
        )}
      />
      <TooltipContent side="top">{upload()}</TooltipContent>
    </Tooltip>
  );
}
