import type {Module} from "../../type/module";
import path from "node:path";
import {exists} from "../../utils/exist";
import fs from "node:fs";
import {getDiscordAppPath} from "../../utils/discordPath";
import {promisify} from "node:util";
import stream from "node:stream";
import got from "got";

export default class VencordModule implements Module {
    static readonly moduleName = 'Vencord';
    static readonly description = 'Vencord';
    readonly repository = "https://api.github.com/repos/Vendicated/Vencord/releases/latest"
    private discordPath;
    private vencordFolder;
    private vencordDistFolder;

    constructor(discordPath: string) {
        this.discordPath = discordPath
        this.vencordFolder = path.join(this.discordPath, "Vencord");
        this.vencordDistFolder = path.join(this.vencordFolder, "dist");
    }

    private makeDirectory = async () => {
        const folders = [this.vencordFolder, this.vencordDistFolder]
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

    private getAssetsList = async () => {
        const mandatoryAsset = [
            "patcher.js",
            "patcher.js.LEGAL.txt",
            "patcher.js.map",
            "preload.js",
            "preload.js.map",
            "renderer.css",
            "renderer.css.map",
            "renderer.js",
            "renderer.js.LEGAL.txt",
            "renderer.js.map",
        ]
        try {
            // @ts-ignore
            const {body} = await got.get(this.repository, {responseType: "json"});
            // @ts-ignore
            return body.assets.filter((v: {
                name: string
            }) => mandatoryAsset.includes(v.name)).map((v: { browser_download_url: string, name: string }) => ({
                name: v.name,
                url: v.browser_download_url
            }));
        } catch (err) {
            console.log("Unable to fetch Vencord asset list")
            throw err;
        }
    }

    private downloadAsset = async () => {
        try {
            const distPath = path.join(this.vencordFolder, "dist");
            const assetList = await this.getAssetsList();
            await Promise.allSettled(assetList.map(async (asset: { name: string, url: string }) => {
                console.log(`Fetching ${asset.name}`);
                const pipeline = promisify(stream.pipeline);
                await pipeline(
                    got.stream(asset.url),
                    fs.createWriteStream(path.join(distPath, asset.name))
                );
            }))
            console.log("✅ Download asset successful");
        } catch (err) {
            throw new Error("Unable to download Vencord asset file");
        }
    }

    private prepareFolderForInject = async () => {
        const appPath = await getDiscordAppPath(this.discordPath) as string;
        const orgAppAsarPath = path.join(this.discordPath, "app", appPath, "resources", "app")
        const newOrgAppAsarPath = path.join(this.discordPath, "app", appPath, "resources", "_app.asar")
        const vencordAppAsarPath = path.join(this.discordPath, "app", appPath, "resources", "app.asar")
        try {
            if (!exists(newOrgAppAsarPath)) {
                fs.renameSync(orgAppAsarPath, newOrgAppAsarPath)
                console.log(`✅ Directory rename: ${newOrgAppAsarPath}`);
            }
            if (!exists(vencordAppAsarPath)) {
                fs.mkdirSync(vencordAppAsarPath);
                console.log(`✅ Directory created: ${vencordAppAsarPath}`);
            }
        } catch (err) {
            throw err
        }
    }

    private injectVencord = async () => {
        try {
            const appPath = await getDiscordAppPath(this.discordPath) as string;
            const vencordAppAsarPath = path.join(this.discordPath, "app", appPath, "resources", "app.asar")
            fs.writeFileSync(path.join(vencordAppAsarPath, "package.json"), `{\n"name": "discord",\n"main": "index.js"}`);
            fs.writeFileSync(path.join(vencordAppAsarPath, "index.js"), `require("${path.join(this.vencordDistFolder,"patcher.js").replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}");`);
            console.log("✅ Injection successful");
        } catch (err: any) {
            throw err
        }
    }

    install = async (path: string) => {
        try {
            await this.makeDirectory()
            await this.downloadAsset();
            await this.prepareFolderForInject();
            await this.injectVencord();

            console.log("");
            console.log(`✅ Install successful, please restart Discord.`);
            process.exit();
        } catch (err: any) {
            console.log(`❌ Install failed: ${err.message}`);
            return false
        }
    }
}