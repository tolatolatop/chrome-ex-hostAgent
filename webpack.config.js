const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        content: './src/content/content.js',
        background: './src/background/background.ts',
        config: './src/config/config.js'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
    },
    mode: 'production',
    devtool: 'cheap-module-source-map',
    optimization: {
        minimize: true,
        moduleIds: 'deterministic',
        runtimeChunk: false,
        splitChunks: {
            cacheGroups: {
                default: false,
            },
        },
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            ['@babel/preset-react', {
                                runtime: 'automatic'
                            }],
                            ['@babel/preset-env', {
                                targets: {
                                    chrome: "88"
                                },
                                modules: false
                            }]
                        ],
                        compact: true
                    },
                },
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/side-panel/side-panel.html',
            filename: 'side-panel.html',
            chunks: ['side-panel'],
            minify: {
                removeComments: true,
                collapseWhitespace: true
            }
        }),
        new HtmlWebpackPlugin({
            template: './src/config/config.html',
            filename: 'config/config.html',
            chunks: ['config'],
            minify: {
                removeComments: true,
                collapseWhitespace: true
            }
        }),
        new CopyPlugin({
            patterns: [
                { from: 'public' },
            ],
        }),
    ],
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.jsx'],
    },
};