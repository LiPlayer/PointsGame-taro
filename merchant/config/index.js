import { defineConfig } from '@tarojs/cli'
import path from 'path'
import { UnifiedWebpackPluginV5 } from 'weapp-tailwindcss/webpack'

export default defineConfig(async (merge, { command, mode }) => {
    const sharedPath = path.resolve(__dirname, '../..', 'shared')
    const baseConfig = {
        projectName: 'points-game-merchant',
        date: '2026-02-13',
        designWidth: 375,
        deviceRatio: {
            640: 2.34 / 2,
            750: 1,
            375: 2,
            828: 1.81 / 2
        },
        sourceRoot: '.',
        outputRoot: 'dist',
        alias: {
            '@': path.resolve(__dirname, '..'),
            '@shared': sharedPath
        },
        plugins: [],
        defineConstants: {},
        copy: {
            patterns: [],
            options: {}
        },
        framework: 'react',
        compiler: 'webpack5',
        cache: {
            enable: false
        },
        mini: {
            compile: {
                include: [sharedPath]
            },
            postcss: {
                pxtransform: {
                    enable: true,
                    config: {}
                },
                cssModules: {
                    enable: false,
                    config: {
                        namingPattern: 'module',
                        generateScopedName: '[name]__[local]___[hash:base64:5]'
                    }
                }
            },
            webpackChain(chain) {
                chain.merge({
                    plugin: {
                        install: {
                            plugin: UnifiedWebpackPluginV5,
                            args: [{
                                appType: 'taro'
                            }]
                        }
                    }
                })
            }
        },
        h5: {
            compile: {
                include: [sharedPath]
            }
        }
    }

    if (process.env.NODE_ENV === 'development') {
        return merge({}, baseConfig, require('./dev'))
    }
    return merge({}, baseConfig, require('./prod'))
})
