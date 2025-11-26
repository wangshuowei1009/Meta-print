const path = require('path');
const webpack = require('webpack');


module.exports = {
    entry: {
        bundle: './src/index.js',
        //bundle2: './src/index2.js',
        bundlesell: './src/indexsell.js',
        // bundlesellxiao: './src/indexsellxiao.js',
        bundlejj: './src/jj.js',
        bundlebuy: './src/buy.js'


    },
    output: {
        filename: '[name].js',  // [name] 会被 entry 的 key 替换
        path: path.resolve(__dirname, 'dist'),
    },








    resolve: {
        fallback: {
            "crypto": require.resolve('crypto-browserify'),
            "stream": require.resolve('stream-browserify'),
            "vm": require.resolve('vm-browserify'),
            "buffer": require.resolve('buffer/'),
            "util": require.resolve('util/'),
            "assert": require.resolve('assert/'),
            "http": require.resolve('stream-http'),
            "https": require.resolve('https-browserify'),
            "os": require.resolve('os-browserify/browser'),
            "path": require.resolve('path-browserify'),
            "url": require.resolve('url/'),
            "zlib": require.resolve('browserify-zlib'),
            "process": false
        },
        extensions: ['.js', '.mjs', '.jsx', '.json']
    },
    module: {
        rules: [
            {
                test: /\.m?js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                },
                resolve: {
                    fullySpecified: false
                }
            }
        ]
    },
    plugins: [
        new webpack.ProvidePlugin({
            process: require.resolve('process/browser'),
            Buffer: ['buffer', 'Buffer']
        }),
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('development'),
            'process.browser': true,  // Add this line
            'process.version': JSON.stringify(process.version)  // Add this line
        })
    ],
    mode: 'development',
};

