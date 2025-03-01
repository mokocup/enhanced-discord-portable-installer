import fs from "node:fs";
import path from "node:path";

export const getDiscordAppPath = async (discordPath: string) => {
    if (!discordPath)
        return
    // Discord Portable don't have multiple versions of app so we can assume this is safe for get correct one
    // TODO: Remind to check this in future maybe
    try {
        return fs.readdirSync(path.join(discordPath,"app")).find(dir => dir.startsWith("app-"))
    } catch (e) {
        console.log(`No app directory found in ${discordPath}`)
        return;
    }
}