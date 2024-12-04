const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        popup: './src/popup/index.js',
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
            template: './src/popup/popup.html',
            filename: 'popup.html',
            chunks: ['popup'],
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
        extensions: ['.js', '.jsx'],
    },
};