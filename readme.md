# Google drive downloader

Really simple terminal app that allows you to navigate through your google drive directories and select 1 to download all it's files.

## Setup

Create or use an existing Google cloud project with drive api enabled (https://www.googleapis.com/auth/drive.readonly)

Copy `.env.sample` to `.env` and fill it up.

Ensure you have deno installed.

Dependencies are installed when you run deno.

## Running

```shell
deno task start 
```

## Usage

Follow the simple prompts to select your folder and download the files. The navigation is one-way - there's is no going back if you select the wrong directory for now!