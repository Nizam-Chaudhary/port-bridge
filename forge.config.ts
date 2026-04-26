import type { ForgeConfig } from '@electron-forge/shared-types';

import { MakerDeb } from '@electron-forge/maker-deb';
// import { MakerRpm } from '@electron-forge/maker-rpm';
// import { MakerSquirrel } from '@electron-forge/maker-squirrel';
// import { MakerZIP } from '@electron-forge/maker-zip';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import path from 'node:path';

const iconsDir = path.resolve(__dirname, 'public/icons');

const config: ForgeConfig = {
    packagerConfig: {
        asar: true,
        executableName: 'ssh-manager',
        // Keep cross-platform icon wiring ready while non-DEB makers stay disabled.
        // icon:
        //     process.platform === 'win32'
        //         ? path.join(iconsDir, 'ssh-manager.ico')
        //         : process.platform === 'darwin'
        //             ? path.join(iconsDir, 'ssh-manager.icns')
        //             : path.join(iconsDir, 'ssh-manager.png'),
    },
    rebuildConfig: {},
    makers: [
        // Keep Windows build disabled for now.
        // new MakerSquirrel({
        //     name: 'SSHManager',
        //     setupIcon: path.join(iconsDir, 'ssh-manager.ico'),
        //     iconUrl: 'https://example.com/ssh-manager.ico',
        // }),
        // Keep macOS build disabled for now.
        // new MakerZIP({}, ['darwin']),
        // Keep RPM build disabled for now.
        // new MakerRpm({
        //     options: {
        //         productName: 'SSH Manager',
        //         icon: path.join(iconsDir, 'ssh-manager.png'),
        //     },
        // }),
        new MakerDeb({
            options: {
                productName: 'SSH Manager',
                icon: path.join(iconsDir, 'ssh-manager.svg'),
                depends: ['sshpass'],
            },
        }),
    ],
    plugins: [
        new VitePlugin({
            // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
            // If you are familiar with Vite configuration, it will look really familiar.
            build: [
                {
                    // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
                    entry: 'src/main.ts',
                    config: 'vite.main.config.ts',
                    target: 'main',
                },
                {
                    entry: 'src/preload.ts',
                    config: 'vite.preload.config.ts',
                    target: 'preload',
                },
            ],
            renderer: [
                {
                    name: 'main_window',
                    config: 'vite.config.ts',
                },
            ],
        }),
        // Fuses are used to enable/disable various Electron functionality
        // at package time, before code signing the application
        new FusesPlugin({
            version: FuseVersion.V1,
            [FuseV1Options.RunAsNode]: false,
            [FuseV1Options.EnableCookieEncryption]: true,
            [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
            [FuseV1Options.EnableNodeCliInspectArguments]: false,
            [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
            [FuseV1Options.OnlyLoadAppFromAsar]: true,
        }),
    ],
};

export default config;
