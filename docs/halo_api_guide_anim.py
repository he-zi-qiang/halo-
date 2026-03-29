"""
Halo 接口知识完全指南 — 3Blue1Brown 风格 Manim 动画
以实际开发时间线为主线，从「点」扩展到「面」
动画时长已与 AI 配音音频精确对齐。

运行: manim -pql halo_api_guide_anim.py HaloAPIGuide
高清: manim -pqh halo_api_guide_anim.py HaloAPIGuide
"""

from manim import *

# ═══ 颜色主题 ═══
BG = "#0a0e1a"
SURFACE = "#131a2e"
BLUE = "#64ffda"
PURPLE = "#bd93f9"
PINK = "#ff79c6"
ORANGE = "#ffb86c"
GREEN = "#50fa7b"
RED = "#ff5555"
YELLOW = "#f1fa8c"
CYAN = "#8be9fd"
TXT = "#e2e8f0"
TXT2 = "#8892b0"

# ═══ 每段音频实际时长 + 间隔 0.8s ═══
# 00_title:    11.8s
# 01_api:      23.3s  (+0.8 gap = starts ~12.6)
# 02_http:     27.7s
# 03_testing:  21.5s
# 04_doc:      22.2s
# 05_backend:  24.5s
# 06_frontend: 17.7s
# 07_auth:     22.2s
# 08_chain:    19.1s
# 09_outro:    15.4s


class HaloAPIGuide(Scene):
    def construct(self):
        self.camera.background_color = BG
        self.scene_title()        # 11.8s
        self.scene_01()           # 24.1s (23.3 + 0.8 gap)
        self.scene_02()           # 28.5s
        self.scene_03()           # 22.3s
        self.scene_04()           # 23.0s
        self.scene_05()           # 25.3s
        self.scene_06()           # 18.5s
        self.scene_07()           # 23.0s
        self.scene_08()           # 19.9s
        self.scene_outro()        # 15.4s

    # ───── 工具函数 ─────
    def section_title(self, num, title, color=BLUE, hold=1.5):
        """章节标题：~3.5s base + hold"""
        num_text = Text(num, font_size=120, color=color, weight=BOLD).set_opacity(0.15)
        title_text = Text(title, font_size=42, color=color, weight=BOLD)
        title_text.next_to(num_text, DOWN, buff=0.3)
        grp = VGroup(num_text, title_text).move_to(ORIGIN)
        self.play(FadeIn(num_text, scale=2), run_time=0.8)
        self.play(Write(title_text), run_time=1.0)
        self.wait(hold)
        self.play(FadeOut(grp, shift=UP), run_time=0.6)

    def point_to_surface(self, dot_pos, items, color=BLUE, expand_time=1.5):
        """从一个点扩展到多个知识点"""
        dot = Dot(dot_pos, color=color, radius=0.12)
        dot.set_glow_factor(0.8)
        self.play(FadeIn(dot, scale=3), run_time=0.6)
        branches = VGroup()
        for item_mob in items:
            line = Line(dot.get_center(), item_mob.get_left(), color=color, stroke_width=1.5)
            line.set_opacity(0.4)
            branches.add(line)
        self.play(
            *[Create(l) for l in branches],
            *[FadeIn(item, shift=RIGHT * 0.3) for item in items],
            run_time=expand_time
        )
        return dot, branches

    # ═══════════ 开场 (11.8s) ═══════════
    def scene_title(self):
        # "大家好，欢迎来到接口知识完全指南..."
        title = Text("接口知识完全指南", font_size=56, weight=BOLD, color=WHITE)
        sub = Text("以 Halo 博客系统为例 · 3Blue1Brown 风格", font_size=24, color=TXT2)
        sub.next_to(title, DOWN, buff=0.4)
        badge = Text("Halo 2.2 · Java Spring WebFlux · Vue 3", font_size=18, color=CYAN)
        badge.next_to(sub, DOWN, buff=0.5)

        self.play(Write(title), run_time=2.0)       # 0-2
        self.play(FadeIn(sub, shift=UP*0.3), run_time=1.0)  # 2-3
        self.play(FadeIn(badge), run_time=0.8)       # 3-3.8
        self.wait(6.5)                                # 3.8-10.3 配音继续
        self.play(FadeOut(VGroup(title, sub, badge), shift=UP), run_time=0.7)  # ~11

    # ═══════════ 第1章：什么是接口 (24.1s) ═══════════
    def scene_01(self):
        # 标题 ~4s
        self.section_title("01", "什么是接口？", GREEN, hold=1.5)

        # "用一个比喻来理解：你是顾客..."
        label_you = Text("你（前端）", font_size=24, color=PINK, weight=BOLD)
        label_waiter = Text("服务员（接口）", font_size=24, color=GREEN, weight=BOLD)
        label_kitchen = Text("厨房（后端）", font_size=24, color=PURPLE, weight=BOLD)

        icon_you = Circle(radius=0.4, color=PINK, fill_opacity=0.2).move_to(LEFT*4.5)
        icon_waiter = Circle(radius=0.4, color=GREEN, fill_opacity=0.2).move_to(ORIGIN)
        icon_kitchen = Circle(radius=0.4, color=PURPLE, fill_opacity=0.2).move_to(RIGHT*4.5)

        label_you.next_to(icon_you, DOWN, buff=0.2)
        label_waiter.next_to(icon_waiter, DOWN, buff=0.2)
        label_kitchen.next_to(icon_kitchen, DOWN, buff=0.2)

        center_dot = Dot(ORIGIN, color=GREEN, radius=0.15).set_glow_factor(1)
        self.play(FadeIn(center_dot, scale=5), run_time=0.6)  # ~4.6
        self.wait(0.5)

        self.play(
            ReplacementTransform(center_dot, icon_waiter),
            FadeIn(icon_you, shift=LEFT), FadeIn(icon_kitchen, shift=RIGHT),
            FadeIn(label_you), FadeIn(label_waiter), FadeIn(label_kitchen),
            run_time=1.2
        )  # ~6.9

        arrow1 = Arrow(icon_you.get_right(), icon_waiter.get_left(), color=ORANGE, buff=0.1, stroke_width=3)
        req_label = Text("我要宫保鸡丁", font_size=16, color=ORANGE)
        req_label.next_to(arrow1, UP, buff=0.1)
        self.play(GrowArrow(arrow1), FadeIn(req_label, shift=UP*0.2), run_time=0.8)  # ~7.7

        arrow2 = Arrow(icon_waiter.get_right(), icon_kitchen.get_left(), color=ORANGE, buff=0.1, stroke_width=3)
        self.play(GrowArrow(arrow2), run_time=0.8)  # ~8.5

        self.wait(2)  # "服务员把需求转达给厨房" ~10.5

        arrow_back = Arrow(icon_kitchen.get_left(), icon_you.get_right(),
                           color=GREEN, buff=0.1, stroke_width=3).shift(DOWN*0.5)
        res_label = Text("200 OK + 菜上桌了", font_size=16, color=GREEN)
        res_label.next_to(arrow_back, DOWN, buff=0.1)
        self.play(GrowArrow(arrow_back), FadeIn(res_label), run_time=0.8)  # ~11.3

        self.wait(3)  # "厨房做好后再端给你" ~14.3

        # "在 Halo 里，这就是一个 POST 请求..."
        real_title = Text("在 Halo 里，这就是：", font_size=22, color=TXT2)
        real_title.to_edge(DOWN, buff=1.5)
        mapping = VGroup(
            Text("POST /api/v1alpha1/posts", font_size=20, color=CYAN, font="Menlo"),
            Text("→ 创建一篇文章", font_size=20, color=TXT2),
        ).arrange(RIGHT, buff=0.3)
        mapping.next_to(real_title, DOWN, buff=0.3)

        self.play(FadeIn(real_title), FadeIn(mapping, shift=UP*0.2), run_time=1.0)  # ~15.3
        self.wait(7.5)   # 配音说完 ~22.8
        self.play(FadeOut(Group(*self.mobjects)), run_time=0.5)  # ~23.3

    # ═══════════ 第2章：HTTP 解剖 (28.5s) ═══════════
    def scene_02(self):
        self.section_title("02", "接口的本质：HTTP 请求", CYAN, hold=2)  # ~4.4

        # "一个请求由四部分组成"
        center = Dot(ORIGIN, color=CYAN, radius=0.15).set_glow_factor(1)

        positions = [UP*1.8+LEFT*3, UP*1.8+RIGHT*3, DOWN*1.5+LEFT*3, DOWN*1.5+RIGHT*3]
        labels_data = [
            ("方法 Method", "GET / POST / PUT / DELETE", ORANGE),
            ("路径 URL", "/api/v1alpha1/posts", GREEN),
            ("请求头 Headers", "Content-Type, Authorization", PURPLE),
            ("请求体 Body", '{"title": "我的文章", ...}', PINK),
        ]

        items = VGroup()
        for pos, (title, detail, color) in zip(positions, labels_data):
            t = Text(title, font_size=22, color=color, weight=BOLD)
            d = Text(detail, font_size=16, color=TXT2, font="Menlo")
            grp = VGroup(t, d).arrange(DOWN, buff=0.15, aligned_edge=LEFT)
            box = SurroundingRectangle(grp, color=color, fill_color=SURFACE,
                                       fill_opacity=0.8, buff=0.2, corner_radius=0.08)
            item = VGroup(box, grp).move_to(pos)
            items.add(item)

        self.play(FadeIn(center, scale=5), run_time=0.5)  # ~4.9

        lines = VGroup()
        for item in items:
            line = Line(center.get_center(), item.get_center(), color=CYAN,
                        stroke_width=1.5, stroke_opacity=0.3)
            lines.add(line)

        # 逐个展开，配合配音节奏
        for i, (line, item) in enumerate(zip(lines, items)):
            self.play(Create(line), FadeIn(item, scale=0.7), run_time=1.0)
            self.wait(1.5)  # 每个停顿让配音解释
        # ~4.9 + 4*(1.0+1.5) = ~14.9

        self.wait(3)  # "携带认证信息和内容类型..." ~17.9

        # "响应也是 HTTP，状态码告诉你结果"
        status_title = Text("响应也是 HTTP", font_size=24, color=YELLOW, weight=BOLD)
        status_title.to_edge(DOWN, buff=1.8)
        codes = VGroup(
            Text("200 OK", font_size=20, color=GREEN, font="Menlo"),
            Text("400 参数错", font_size=20, color=ORANGE, font="Menlo"),
            Text("401 没认证", font_size=20, color=RED, font="Menlo"),
            Text("404 找不到", font_size=20, color=PINK, font="Menlo"),
            Text("500 炸了", font_size=20, color=RED, font="Menlo"),
        ).arrange(RIGHT, buff=0.4)
        codes.next_to(status_title, DOWN, buff=0.3)

        self.play(FadeIn(status_title), run_time=0.5)  # ~18.4
        self.play(LaggedStartMap(FadeIn, codes, shift=UP*0.2, lag_ratio=0.2), run_time=2.0)  # ~20.4
        self.wait(6.5)  # 配音说完状态码含义 ~26.9
        self.play(FadeOut(Group(*self.mobjects)), run_time=0.6)  # ~27.5

    # ═══════════ 第3章：接口测试 (22.3s) ═══════════
    def scene_03(self):
        self.section_title("03", "什么是接口测试？", ORANGE, hold=2)  # ~4.4

        # "看这个测试金字塔"
        pyramid_title = Text("测试金字塔 — 接口测试性价比最高", font_size=26,
                             color=TXT, weight=BOLD)
        pyramid_title.to_edge(UP, buff=0.8)

        e2e = Polygon([-1.2,0,0],[1.2,0,0],[0,0.8,0],
                       color=RED, fill_color=RED, fill_opacity=0.3, stroke_width=2)
        e2e_label = Text("E2E 端到端", font_size=18, color=RED, weight=BOLD)
        e2e_label.move_to(e2e).shift(DOWN*0.1)

        api = Polygon([-2.5,-1.2,0],[2.5,-1.2,0],[-1.2,0,0],[1.2,0,0],
                       color=CYAN, fill_color=CYAN, fill_opacity=0.3, stroke_width=2)
        api_label = Text("接口测试（API Test）", font_size=20, color=CYAN, weight=BOLD)
        api_label.move_to(api)

        unit = Polygon([-4,-2.5,0],[4,-2.5,0],[-2.5,-1.2,0],[2.5,-1.2,0],
                        color=PURPLE, fill_color=PURPLE, fill_opacity=0.2, stroke_width=2)
        unit_label = Text("单元测试（Unit Test）", font_size=20, color=PURPLE, weight=BOLD)
        unit_label.move_to(unit)

        pyramid = VGroup(unit, api, e2e, unit_label, api_label, e2e_label).shift(DOWN*0.3)

        self.play(FadeIn(pyramid_title), run_time=0.6)  # ~5.0
        self.play(FadeIn(unit, shift=UP*0.3), Write(unit_label), run_time=1.0)  # ~6.0
        self.wait(1.5)  # "底层是单元测试" ~7.5
        self.play(FadeIn(api, shift=UP*0.3), Write(api_label), run_time=1.0)  # ~8.5
        self.wait(1.5)  # "中间这层接口测试" ~10.0
        self.play(FadeIn(e2e, shift=UP*0.3), Write(e2e_label), run_time=1.0)  # ~11.0
        self.wait(2)    # "顶层是端到端测试" ~13.0

        # 高亮接口测试层
        highlight = SurroundingRectangle(api, color=YELLOW, stroke_width=3, buff=0.05)
        arrow_note = Text("← 速度快 + 覆盖广 + 稳定", font_size=18, color=YELLOW)
        arrow_note.next_to(api, RIGHT, buff=0.5)
        self.play(Create(highlight), FadeIn(arrow_note, shift=LEFT*0.3), run_time=1.0)  # ~14.0
        self.wait(6.5)  # "性价比最高...这就是为什么" ~20.5
        self.play(FadeOut(Group(*self.mobjects)), run_time=0.6)  # ~21.1

    # ═══════════ 第4章：接口文档 (23.0s) ═══════════
    def scene_04(self):
        self.section_title("04", "什么是接口文档？", YELLOW, hold=2)  # ~4.4

        # "它是测试用例设计的依据。一份接口文档包含六类关键信息"
        dot_pos = LEFT*5 + UP*0.5
        info_items = [
            ("① 路径 + 方法", "POST /api/v1alpha1/posts", ORANGE),
            ("② 请求头", "Authorization: Basic xxx", PURPLE),
            ("③ 参数（必填/选填）", 'title: string (必填)', PINK),
            ("④ 响应结果", '{"metadata": {"name": "..."}}', GREEN),
            ("⑤ 状态码", "200 / 400 / 401 / 404", CYAN),
            ("⑥ 参数关联", "name → 后续接口需要用", YELLOW),
        ]

        items = VGroup()
        for i, (title, detail, color) in enumerate(info_items):
            t = Text(title, font_size=20, color=color, weight=BOLD)
            d = Text(detail, font_size=14, color=TXT2, font="Menlo")
            grp = VGroup(t, d).arrange(RIGHT, buff=0.3)
            grp.move_to(RIGHT*1 + UP*(2 - i*0.85))
            items.add(grp)

        dot, branches = self.point_to_surface(dot_pos, items, YELLOW, expand_time=2.0)  # ~7.0
        self.wait(8)  # 配音逐个解释六类信息 ~15.0

        note = Text("接口文档 = 测试用例设计的依据", font_size=22, color=YELLOW, weight=BOLD)
        note.to_edge(DOWN, buff=0.8)
        self.play(FadeIn(note, shift=UP*0.3), run_time=0.8)  # ~15.8
        self.wait(5.5)  # "比如创建文章返回的name字段..." ~21.3
        self.play(FadeOut(Group(*self.mobjects)), run_time=0.6)  # ~21.9

    # ═══════════ 第5章：后端源码 (25.3s) ═══════════
    def scene_05(self):
        self.section_title("05", "后端如何定义一个接口？", PURPLE, hold=2)  # ~4.4

        title = Text("Halo 后端：三层代码结构", font_size=26, color=PURPLE, weight=BOLD)
        title.to_edge(UP, buff=0.6)
        self.play(FadeIn(title), run_time=0.5)  # ~4.9

        layers_data = [
            ("1. Endpoint（路由定义）", 'POST("/posts").body(PostRequest.class)', "定义 URL + 方法", GREEN),
            ("2. @Schema（数据模型）", '@Schema(requiredMode = REQUIRED)', "字段校验 + 文档生成", CYAN),
            ("3. PostRequest（请求体）", 'class PostRequest { Post post; Content content; }', "封装前端传入的数据", PINK),
        ]

        layers = VGroup()
        for i, (name, code, desc, color) in enumerate(layers_data):
            name_t = Text(name, font_size=20, color=color, weight=BOLD)
            code_t = Text(code, font_size=14, color=TXT2, font="Menlo")
            desc_t = Text(desc, font_size=14, color=TXT2)
            row = VGroup(name_t, code_t, desc_t).arrange(DOWN, buff=0.1, aligned_edge=LEFT)
            box = SurroundingRectangle(row, color=color, fill_color=SURFACE,
                                       fill_opacity=0.8, buff=0.2, corner_radius=0.08)
            item = VGroup(box, row)
            layers.add(item)
        layers.arrange(DOWN, buff=0.3).next_to(title, DOWN, buff=0.5)

        center = Dot(LEFT*5, color=PURPLE, radius=0.12).set_glow_factor(0.8)
        self.play(FadeIn(center, scale=3), run_time=0.5)  # ~5.4

        # 逐层展开，配合配音
        for i, layer in enumerate(layers):
            line = Line(center.get_center(), layer.get_left(), color=PURPLE,
                        stroke_width=1.5, stroke_opacity=0.3)
            self.play(Create(line), FadeIn(layer, shift=RIGHT*0.5), run_time=1.0)
            self.wait(2.5)  # 每层配音解释 ~3.5s each
        # ~5.4 + 3*3.5 = ~15.9

        # 关键洞察
        insight = Text("注解 → 文档 → SDK → 测试，全部自动化串联",
                        font_size=20, color=YELLOW, weight=BOLD)
        insight.to_edge(DOWN, buff=0.6)
        self.play(FadeIn(insight, shift=UP*0.2), run_time=0.8)  # ~16.7
        self.wait(7)   # 配音说完 ~23.7
        self.play(FadeOut(Group(*self.mobjects)), run_time=0.6)  # ~24.3

    # ═══════════ 第6章：前端调用 (18.5s) ═══════════
    def scene_06(self):
        self.section_title("06", "前端如何调用一个接口？", PINK, hold=1.5)  # ~3.9

        steps_data = [
            ("@Schema 注解", BLUE),
            ("OpenAPI JSON", CYAN),
            ("TypeScript SDK", GREEN),
            ("前端调用", PINK),
        ]

        boxes = []
        for i, (text, color) in enumerate(steps_data):
            box = VGroup(
                RoundedRectangle(width=2.8, height=0.8, corner_radius=0.1,
                                  color=color, fill_color=SURFACE, fill_opacity=0.8),
                Text(text, font_size=18, color=color, weight=BOLD)
            )
            box.move_to(LEFT*4.5 + RIGHT*i*3.3)
            boxes.append(box)

        VGroup(*boxes).move_to(UP*1.5)

        # 逐步出现
        for i, box in enumerate(boxes):
            self.play(FadeIn(box, scale=0.8), run_time=0.5)
            if i < len(boxes) - 1:
                arrow = Arrow(boxes[i].get_right(), boxes[i+1].get_left(),
                              color=TXT2, buff=0.1, stroke_width=2)
                self.play(GrowArrow(arrow), run_time=0.4)
            self.wait(0.8)
        # ~3.9 + 4*(0.5+0.4+0.8) = ~10.7

        code = VGroup(
            Text("// 前端一行代码即可调用", font_size=14, color=TXT2, font="Menlo"),
            Text("const { data } = await apiClient.post.listPosts()", font_size=16, color=GREEN, font="Menlo"),
            Text("", font_size=8),
            Text("// 等价于手写的 HTTP 请求：", font_size=14, color=TXT2, font="Menlo"),
            Text('fetch("/api/v1alpha1/posts", {', font_size=16, color=ORANGE, font="Menlo"),
            Text('  headers: { Authorization: "Basic ..." }', font_size=16, color=ORANGE, font="Menlo"),
            Text("})", font_size=16, color=ORANGE, font="Menlo"),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.08)
        code_bg = SurroundingRectangle(code, color=TXT2, fill_color="#0d1117",
                                        fill_opacity=0.95, buff=0.3, corner_radius=0.1)
        code_block = VGroup(code_bg, code).shift(DOWN*1)

        self.play(FadeIn(code_block, shift=UP*0.3), run_time=1.0)  # ~11.7
        self.wait(5.5)  # 配音："一行代码就能完成..." ~17.2
        self.play(FadeOut(Group(*self.mobjects)), run_time=0.6)  # ~17.8

    # ═══════════ 第7章：认证 (23.0s) ═══════════
    def scene_07(self):
        self.section_title("07", "认证是怎么做的？", RED, hold=2)  # ~4.4

        center_dot = Dot(LEFT*5, color=RED, radius=0.12).set_glow_factor(0.8)
        auth_methods = [
            ("Basic Auth", "每次请求带 base64(user:pass)", "适合：Postman 调试", ORANGE),
            ("Session + CSRF", "登录后服务端存 Session", "适合：浏览器 Web 应用", PURPLE),
            ("Bearer Token (JWT)", "登录后客户端存 Token", "适合：API / 移动端 / SPA", CYAN),
        ]

        cards = VGroup()
        for i, (name, detail, usage, color) in enumerate(auth_methods):
            name_t = Text(name, font_size=22, color=color, weight=BOLD)
            detail_t = Text(detail, font_size=14, color=TXT2)
            usage_t = Text(usage, font_size=14, color=TXT2)
            content = VGroup(name_t, detail_t, usage_t).arrange(DOWN, buff=0.1, aligned_edge=LEFT)
            box = SurroundingRectangle(content, color=color, fill_color=SURFACE,
                                       fill_opacity=0.8, buff=0.25, corner_radius=0.1)
            card = VGroup(box, content).move_to(RIGHT*1.5 + UP*(1.5 - i*1.8))
            cards.add(card)

        self.play(FadeIn(center_dot, scale=3), run_time=0.5)  # ~4.9

        # 逐个展开，配合配音
        for i, card in enumerate(cards):
            line = Line(center_dot.get_center(), card.get_left(), color=RED,
                        stroke_width=1.5, stroke_opacity=0.3)
            self.play(Create(line), FadeIn(card, shift=RIGHT*0.5), run_time=1.0)
            self.wait(2.5)  # 每种认证配音解释
        # ~4.9 + 3*3.5 = ~15.4

        note = Text("Halo 同时支持三种 → 测试时每种都要覆盖", font_size=20, color=RED, weight=BOLD)
        note.to_edge(DOWN, buff=0.6)
        self.play(FadeIn(note, shift=UP*0.2), run_time=0.8)  # ~16.2
        self.wait(5.5)   # 配音说完 ~21.7
        self.play(FadeOut(Group(*self.mobjects)), run_time=0.6)  # ~22.3

    # ═══════════ 第8章：完整链路 (19.9s) ═══════════
    def scene_08(self):
        self.section_title("08", "完整链路：从写文章到发布", BLUE, hold=1.5)  # ~3.9

        steps = [
            ("1", "创建草稿", "POST /posts", GREEN),
            ("2", "编辑内容", "PUT /posts/{name}/content", CYAN),
            ("3", "发布文章", "PUT /posts/{name}/publish", ORANGE),
            ("4", "发表评论", "POST /comments", PINK),
            ("5", "审核评论", "PUT /comments/{name}/approve", PURPLE),
        ]

        timeline = Line(LEFT*6, RIGHT*6, color=TXT2, stroke_width=2).shift(UP*0.5)
        self.play(Create(timeline), run_time=0.8)  # ~4.7

        nodes = VGroup()
        for i, (num, name, endpoint, color) in enumerate(steps):
            x = -5 + i*2.5
            dot = Dot([x,0.5,0], color=color, radius=0.12).set_glow_factor(0.5)
            num_t = Text(num, font_size=16, color=color, weight=BOLD)
            num_t.next_to(dot, UP, buff=0.15)
            name_t = Text(name, font_size=16, color=color, weight=BOLD)
            name_t.next_to(dot, DOWN, buff=0.2)
            ep_t = Text(endpoint, font_size=11, color=TXT2, font="Menlo")
            ep_t.next_to(name_t, DOWN, buff=0.1)
            node = VGroup(dot, num_t, name_t, ep_t)
            nodes.add(node)

        # 逐个出现
        for node in nodes:
            self.play(FadeIn(node, shift=UP*0.3), run_time=0.6)
            self.wait(0.5)
        # ~4.7 + 5*1.1 = ~10.2

        # 数据传递箭头
        for i in range(len(nodes)-1):
            arrow = Arrow(nodes[i][0].get_right(), nodes[i+1][0].get_left(),
                          color=YELLOW, buff=0.15, stroke_width=2, max_tip_length_to_length_ratio=0.15)
            self.play(GrowArrow(arrow), run_time=0.4)
        # ~10.2 + 4*0.4 = ~11.8

        key = Text("每步的返回值（name）是下一步的输入 — 这就是参数关联",
                    font_size=18, color=YELLOW, weight=BOLD)
        key.to_edge(DOWN, buff=0.8)
        self.play(FadeIn(key, shift=UP*0.2), run_time=0.8)  # ~12.6
        self.wait(5.8)  # 配音说完 ~18.4
        self.play(FadeOut(Group(*self.mobjects)), run_time=0.6)  # ~19.0

    # ═══════════ 结尾 (15.4s) ═══════════
    def scene_outro(self):
        lines_data = [
            ("前端调用", "SDK 方法", PINK),
            ("→ 变成", "HTTP 请求（方法 + URL + 参数）", ORANGE),
            ("→ 后端", "Endpoint 匹配路由，调用处理方法", PURPLE),
            ("→ 处理方法", "操作数据库，返回 JSON", GREEN),
            ("→ 前端收到响应", "提取 name，供下一个接口使用", CYAN),
        ]

        items = VGroup()
        for action, detail, color in lines_data:
            a = Text(action, font_size=20, color=color, weight=BOLD)
            d = Text(detail, font_size=16, color=TXT2)
            row = VGroup(a, d).arrange(RIGHT, buff=0.3)
            items.add(row)
        items.arrange(DOWN, buff=0.3, aligned_edge=LEFT)

        title = Text("全链路总结", font_size=36, color=WHITE, weight=BOLD)
        title.to_edge(UP, buff=0.8)

        self.play(Write(title), run_time=0.8)  # 0-0.8
        self.play(
            LaggedStartMap(FadeIn, items, shift=RIGHT*0.3, lag_ratio=0.25),
            run_time=2.5
        )  # ~3.3
        self.wait(4)  # 配音："记住这句话..." ~7.3

        # 最终 slogan
        self.play(FadeOut(items), FadeOut(title), run_time=0.5)  # ~7.8
        slogan = Text("源码即文档，分支即用例", font_size=42, weight=BOLD)
        slogan.set_color_by_gradient(BLUE, PURPLE, PINK)
        self.play(Write(slogan), run_time=2.0)  # ~9.8
        self.wait(4)   # 配音说完"感谢观看" ~13.8
        self.play(FadeOut(slogan), run_time=1.2)  # ~15.0
