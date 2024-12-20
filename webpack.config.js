const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        'side-panel': './src/side-panel/index.js',
        content: './src/content/content.js',
        background: './src/background/background.js',
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
            template: './src/side-panel/side-panel.html',
            filename: 'side-panel.html',
            chunks: ['side-panel'],
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