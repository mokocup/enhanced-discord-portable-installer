import fs from 'node:fs';
import {input, select} from "@inquirer/prompts";
import {getDiscordAppPath} from "./utils/discordPath";
import path from "node:path";

const loadedModule: Record<string, any> = {}

const generateInstallerList = async () => {
    const installerList = {
        message: 'Select install type',
        choices: [] as any[],
        required: true,
    }
    // Read Modules Dir
    await Promise.allSettled(fs.readdirSync(path.join(__dirname, "modules")).map(async (moduleName) => {
        const modulePath = `${__dirname}/modules/${moduleName}`;
        try {
            const module = await import(path.join(modulePath, "index.js")).catch(() => import(path.join(modulePath, "index.ts")));
            loadedModule[module.default.moduleName] = module.default
            installerList.choices.push({
                value: module.default.moduleName,
                name: module.default.moduleName,
                description: module.default.description
            })
        } catch (e) {
            console.error(`Fail to load module at ${modulePath}`)
        }
    }))

    return installerList;
}

(async () => {
    console.log('✅ Generating installer list...');
    const installerList = await generateInstallerList();

    const type: string = await select(installerList);

    const discordPath = await input({
        message: 'Enter portable discord path (ex: C:/Users/mokocup/Desktop/discord_portable)',
        default: process.cwd(),
        required: true,
        validate: async (path) => {
            return !!await getDiscordAppPath(path)
        }
    })
    const moduleClass = new loadedModule[type](discordPath)
    await moduleClass.install();
})();

process.on('uncaughtException', (error) => {
    if (error.name === 'ExitPromptError') {
        console.log('👋 until next time!');
    } else {
        // Rethrow unknown errors
        throw error;
    }
});