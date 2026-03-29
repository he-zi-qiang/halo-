"""
为 Halo API 指南动画生成 AI 配音，并与视频合成。
使用 edge-tts（微软 Azure 语音），风格参考 AI 早报。

用法: python3 generate_voiceover.py
"""

import asyncio
import edge_tts
import subprocess
import os
import json

# ═══ 配音稿（每个场景对应一段旁白） ═══
# 按 Manim 动画的场景顺序，节奏紧凑、语气专业
NARRATIONS = [
    # scene_title - 开场
    {
        "id": "00_title",
        "text": "大家好，欢迎来到接口知识完全指南。今天我们以 Halo 博客系统为例，从零理解什么是接口、怎么测试接口。所有知识点，都从源码出发。",
        "duration_hint": 8,
    },
    # scene_01 - 什么是接口
    {
        "id": "01_what_is_api",
        "text": "第一章，什么是接口？用一个比喻来理解：你是顾客，也就是前端；服务员就是接口；厨房就是后端和数据库。你告诉服务员你要什么菜，服务员把需求转达给厨房，厨房做好后再端给你。在 Halo 里，这就是一个 POST 请求，发送到 /api/v1alpha1/posts，用来创建一篇文章。",
        "duration_hint": 18,
    },
    # scene_02 - HTTP 解剖
    {
        "id": "02_http",
        "text": "第二章，接口的本质就是 HTTP 请求。一个请求由四部分组成：方法，告诉服务器你要做什么，是查询还是创建；路径，指向哪个资源；请求头，携带认证信息和内容类型；请求体，就是你要发送的数据。响应也是 HTTP，状态码告诉你结果：200 成功，400 参数错，401 没认证，404 找不到，500 服务器炸了。",
        "duration_hint": 22,
    },
    # scene_03 - 接口测试
    {
        "id": "03_testing",
        "text": "第三章，什么是接口测试？看这个测试金字塔。底层是单元测试，数量多但范围小；顶层是端到端测试，覆盖广但速度慢。而中间这层，接口测试，是性价比最高的。速度快、覆盖广、还很稳定。这就是为什么我们要重点学它。",
        "duration_hint": 16,
    },
    # scene_04 - 接口文档
    {
        "id": "04_doc",
        "text": "第四章，什么是接口文档？它是测试用例设计的依据。一份接口文档包含六类关键信息：路径加方法、请求头、参数的必填和选填、响应结果的结构、状态码的含义、以及参数之间的关联关系。比如创建文章返回的 name 字段，后续发布和评论接口都要用到它。",
        "duration_hint": 20,
    },
    # scene_05 - 后端源码
    {
        "id": "05_backend",
        "text": "第五章，后端如何定义一个接口？以 Halo 源码为例，后端代码分三层：第一层 Endpoint 定义路由，决定 URL 和方法；第二层 Schema 注解定义数据模型，既做字段校验，又自动生成文档；第三层 PostRequest 封装请求体。关键洞察：代码中的注解、文档、SDK、测试，全部自动化串联。",
        "duration_hint": 20,
    },
    # scene_06 - 前端调用
    {
        "id": "06_frontend",
        "text": "第六章，前端如何调用接口？Halo 的做法非常优雅：后端的 Schema 注解自动生成 OpenAPI 文档，再自动生成 TypeScript SDK，前端直接调用类型安全的函数。一行代码就能完成，不用手写任何 HTTP 请求。",
        "duration_hint": 14,
    },
    # scene_07 - 认证
    {
        "id": "07_auth",
        "text": "第七章，认证怎么做？Halo 同时支持三种认证方式：Basic Auth 最简单，每次带用户名密码，适合 Postman 调试；Session 加 CSRF 是浏览器用的，服务端存状态；Bearer Token 也就是 JWT，客户端存 token，适合 API 和移动端。测试时，三种方式都要覆盖。",
        "duration_hint": 18,
    },
    # scene_08 - 完整链路
    {
        "id": "08_chain",
        "text": "第八章，完整链路串讲。从写文章到发布，一共五步：创建草稿、编辑内容、发布文章、发表评论、审核评论。注意，每一步的返回值都是下一步的输入参数。这种参数关联，是接口测试中最容易出错的地方。",
        "duration_hint": 16,
    },
    # scene_outro - 结尾
    {
        "id": "09_outro",
        "text": "最后总结：前端调用 SDK 方法，变成 HTTP 请求，后端匹配路由调用处理方法，操作数据库返回 JSON。记住这句话：源码即文档，分支即用例。感谢观看。",
        "duration_hint": 12,
    },
]

# ═══ TTS 配置 ═══
VOICE = "zh-CN-YunxiNeural"  # 男声，专业播报风格
RATE = "+10%"  # 语速稍快，更有节奏感
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "media", "voiceover")


async def generate_audio(narration):
    """生成单段音频"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    output_path = os.path.join(OUTPUT_DIR, f"{narration['id']}.mp3")

    if os.path.exists(output_path):
        print(f"  [跳过] {narration['id']} 已存在")
        return output_path

    communicate = edge_tts.Communicate(
        text=narration["text"],
        voice=VOICE,
        rate=RATE,
    )
    await communicate.save(output_path)
    print(f"  [生成] {narration['id']} → {output_path}")
    return output_path


async def generate_all():
    """生成所有音频"""
    print("═══ 生成配音音频 ═══")
    paths = []
    for n in NARRATIONS:
        path = await generate_audio(n)
        paths.append(path)
    return paths


def concat_audio(paths, output_path):
    """拼接所有音频，中间加短暂停顿"""
    print("\n═══ 拼接音频 ═══")

    # 创建 filelist
    filelist_path = os.path.join(OUTPUT_DIR, "filelist.txt")
    silence_path = os.path.join(OUTPUT_DIR, "silence_0.8s.mp3")

    # 生成 0.8 秒静音
    subprocess.run([
        "ffmpeg", "-y", "-f", "lavfi", "-i",
        "anullsrc=r=24000:cl=mono", "-t", "0.8",
        "-q:a", "9", "-acodec", "libmp3lame",
        silence_path
    ], capture_output=True)

    with open(filelist_path, "w") as f:
        for i, p in enumerate(paths):
            f.write(f"file '{os.path.abspath(p)}'\n")
            if i < len(paths) - 1:
                f.write(f"file '{os.path.abspath(silence_path)}'\n")

    subprocess.run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", filelist_path, "-acodec", "libmp3lame",
        "-q:a", "2", output_path
    ], capture_output=True)
    print(f"  [完成] 拼接音频 → {output_path}")


def merge_video_audio(video_path, audio_path, output_path):
    """合成视频和音频"""
    print("\n═══ 合成视频+音频 ═══")

    # 获取视频和音频时长
    def get_duration(path):
        result = subprocess.run(
            ["ffprobe", "-v", "quiet", "-print_format", "json",
             "-show_format", path],
            capture_output=True, text=True
        )
        info = json.loads(result.stdout)
        return float(info["format"]["duration"])

    video_dur = get_duration(video_path)
    audio_dur = get_duration(audio_path)
    print(f"  视频时长: {video_dur:.1f}s")
    print(f"  音频时长: {audio_dur:.1f}s")

    # 使用较短的时长（或拉伸音频适配视频）
    # 这里直接合并，取较短的
    subprocess.run([
        "ffmpeg", "-y",
        "-i", video_path,
        "-i", audio_path,
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k",
        "-map", "0:v:0", "-map", "1:a:0",
        "-shortest",
        output_path
    ], capture_output=True)
    print(f"  [完成] 最终视频 → {output_path}")

    final_dur = get_duration(output_path)
    final_size = os.path.getsize(output_path) / (1024 * 1024)
    print(f"  最终时长: {final_dur:.1f}s, 大小: {final_size:.1f}MB")


async def main():
    base_dir = os.path.dirname(__file__)

    # 1. 生成所有配音
    paths = await generate_all()

    # 2. 拼接成完整音频
    full_audio = os.path.join(OUTPUT_DIR, "full_narration.mp3")
    concat_audio(paths, full_audio)

    # 3. 合成到 1080p 视频
    video_path = os.path.join(
        base_dir, "media", "videos", "halo_api_guide_anim",
        "1080p60", "HaloAPIGuide.mp4"
    )

    if not os.path.exists(video_path):
        print(f"\n[错误] 找不到视频: {video_path}")
        print("请先运行: manim -pqh halo_api_guide_anim.py HaloAPIGuide")
        return

    output_path = os.path.join(base_dir, "HaloAPIGuide_with_voice.mp4")
    merge_video_audio(video_path, full_audio, output_path)


if __name__ == "__main__":
    asyncio.run(main())
