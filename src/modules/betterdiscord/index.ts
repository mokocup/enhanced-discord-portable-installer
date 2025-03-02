import type {Module} from "../../type/module";
import path from "node:path";
import fs from "node:fs";
import {exists} from "../../utils/exist";
import {promisify} from "node:util";
import stream from "node:stream";
import got from 'got';
import {getDiscordAppPath} from "../../utils/discordPath";

export default class BetterDiscordModule implements Module {
    static readonly moduleName = "BetterDiscord"
    static readonly description = "BetterDiscord"
    private discordPath;
    private bdFolder;
    private bdDataFolder;
    private bdPluginsFolder;
    private bdThemesFolder;
    private asarPath;

    constructor(discordPath: string) {
        this.discordPath = discordPath
        this.bdFolder = path.join(discordPath, "BetterDiscord");
        this.bdDataFolder = path.join(this.bdFolder, "data");
        this.bdPluginsFolder = path.join(this.bdFolder, "plugins");
        this.bdThemesFolder = path.join(this.bdFolder, "themes");
        this.asarPath = path.join(this.bdFolder, "betterdiscord.asar");
    }

    readonly repository = "https://api.github.com/repos/BetterDiscord/BetterDiscord/releases/latest"

    private checkDiscordFirstRun = async () => {
        console.log("✅ Checking Discord Environment");
        const appPath = await getDiscordAppPath(this.discordPath) as string;
        const injectPath = path.join(this.discordPath, "app", appPath, "modules", "discord_desktop_core-1", "discord_desktop_core", "index.js")
        if (!exists(injectPath)) {
            throw new Error('You need run Discord first so it can download required file')
        }
    }

    private makeDirectory = async () => {
        const folders = [this.bdFolder, this.bdDataFolder, this.bdThemesFolder, this.bdPluginsFolder]
        for (const folder of folders) {
            if (exists(folder)) {
                console.log(`✅ Directory exists: ${folder}`);
                continue;
            }
            try {
                fs.mkdirSync(folder);
                console.log(`✅ Directory created: ${folder}`);
            } catch (err: any) {
                console.log(`Failed to create directory: ${folder}`);
                throw err;
            }
        }
    }

    private getAsarUrl = async () => {
        try {
            // @ts-ignore
            const {body} = await got.get(this.repository, {responseType: "json"});
            // @ts-ignore
            return body.assets.find((v: {
                name: string
            }) => v?.name?.includes('betterdiscord.asar'))?.browser_download_url;
        } catch (err) {
            console.log("Unable to fetch BetterDiscord asar file, are your internet ok ?")
            throw err;
        }
    }

    private downloadAsar = async () => {
        try {
            const asarUrl = await this.getAsarUrl();
            const pipeline = promisify(stream.pipeline);
            await pipeline(
                got.stream(asarUrl),
                fs.createWriteStream(this.asarPath)
            );
            console.log("✅ Download Asar successful");
        } catch (err) {
            console.log("Unable to download BetterDiscord asar file, are your internet ok ?")
            throw err;
        }
    }

    private injectBetterDiscord = async () => {
        try {
            const appPath = await getDiscordAppPath(this.discordPath) as string;
            const injectPath = path.join(this.discordPath, "app", appPath, "modules", "discord_desktop_core-1", "discord_desktop_core", "index.js")
            if (!exists(injectPath)) {
                throw new Error('Unable to inject BetterDiscord, have you run Discord first time ?')
            }
            fs.writeFileSync(injectPath, `require("${this.asarPath.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}");\nmodule.exports = require("./core.asar");`);
            console.log("✅ Injection successful");
        } catch (err: any) {
            throw err
        }
    }

    install = async () => {
        try {
            await this.checkDiscordFirstRun();
            await this.makeDirectory()
            await this.downloadAsar();
            await this.injectBetterDiscord();
            console.log("");
            console.log(`✅ Install successful, please restart Discord.`);
            process.exit();
        } catch (err: any) {
            console.log(`❌ Install failed: ${err.message}`);
            return false
        }
    }
}