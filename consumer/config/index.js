import { defineConfig } from '@tarojs/cli'
import path from 'path'

import devConfig from './dev'
import prodConfig from './prod'

// https://taro-docs.jd.com/docs/next/config#defineconfig-辅助函数
import { UnifiedWebpackPluginV5 } from 'weapp-tailwindcss/webpack'

export default defineConfig(async (merge, { command, mode }) => {
  const prebundleEnabled = false
  const sharedPath = path.resolve(__dirname, '../..', 'shared')
  const transpilePaths = [
    sharedPath,
    // Pixi v7 ships modern syntax (e.g. optional chaining) that some MiniProgram runtimes/devtools can't parse.
    // Force Babel/webpack to compile these deps for the mini build.
    path.resolve(__dirname, '..', 'node_modules', 'pixi.js'),
    path.resolve(__dirname, '..', 'node_modules', 'pixi-miniprogram'),
    path.resolve(__dirname, '..', 'node_modules', '@pixi')
  ]
  const baseConfig = {
    projectName: 'points-game-taro',
    date: '2026-2-4',
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
      '@shared': path.resolve(__dirname, '../..', 'shared')
    },
    plugins: [
      "@tarojs/plugin-generator"
    ],
    defineConstants: {
    },
    copy: {
      patterns: [
      ],
      options: {
      }
    },
    framework: 'react',
    compiler: {
      type: 'webpack5',
      prebundle: {
        enable: false,
        exclude: []
      }
    },
    cache: {
      enable: false // Webpack 持久化缓存配置，建议开启。默认配置请参考：https://docs.taro.zone/docs/config-detail#cache
    },
    mini: {
      output: {
        clean: true
      },
      compile: {
        include: transpilePaths
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
          },
          optimization: {
            splitChunks: {
              cacheGroups: {
                gameEngine: {
                  name: 'vendors', // Force into main package vendors
                  test: /[\\/]node_modules[\\/](three|three-platformize|cannon-es|pixi\.js|pixi-miniprogram|@pixi|matter-js)[\\/]/,
                  priority: 100, // High priority to override default split
                  chunks: 'all',
                  enforce: true
                }
              }
            }
          }
        })
      },
      postcss: {
        pxtransform: {
          enable: true,
          config: {

          }
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      },
    },
    h5: {
      publicPath: '/',
      staticDirectory: 'static',
      output: {
        filename: 'js/[name].[hash:8].js',
        chunkFilename: 'js/[name].[chunkhash:8].js'
      },
      compile: {
        include: transpilePaths
      },
      miniCssExtractPluginOption: {
        ignoreOrder: true,
        filename: 'css/[name].[hash].css',
        chunkFilename: 'css/[name].[chunkhash].css'
      },
      postcss: {
        pxtransform: {
          enable: true,
          config: {
            // Align H5 rem scale with prototype.html (Tailwind defaults to 16px root).
            // Taro's default baseFontSize (20) makes Tailwind rem units appear larger,
            // which can cause unexpected overflow/scroll when comparing to the prototype.
            baseFontSize: 16,
            minRootSize: 16
          }
        },
        autoprefixer: {
          enable: true,
          config: {}
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      }
    },
    rn: {
      appName: 'taroDemo',
      postcss: {
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
        }
      }
    }
  }


  if (process.env.NODE_ENV === 'development') {
    // 本地开发构建配置（不混淆压缩）
    return merge({}, baseConfig, devConfig)
  }
  // 生产构建配置（默认开启压缩混淆等）
  return merge({}, baseConfig, prodConfig)
})
