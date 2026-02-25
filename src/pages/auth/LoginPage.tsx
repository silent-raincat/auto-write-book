import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Form, Input, Button, Card, Typography, message, Space } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/stores/useAuthStore'
import { api } from '@/lib/api'

const { Title, Text } = Typography

interface LoginForm {
  email: string
  password: string
}

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: LoginForm) => {
    setLoading(true)
    try {
      const response = await api.post<{
        user: { id: string; email: string; name: string; plan: string }
        token: string
      }>('/auth/login', {
        email: values.email,
        password: values.password
      })

      // 保存用户信息和 token（类型转换）
      login({
        ...response.user,
        plan: response.user.plan as 'free' | 'premium'
      }, response.token)

      // 保存 token 到 localStorage
      localStorage.setItem('auth_token', response.token)

      message.success('登录成功！')
      navigate('/dashboard')
    } catch (error: any) {
      message.error(error.message || '登录失败，请检查邮箱和密码')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#12122e] to-[#1a1a3e] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[rgba(18,18,46,0.8)] backdrop-blur-xl border border-[rgba(167,139,250,0.2)]">
        <div className="text-center mb-8">
          <Title level={2} className="text-white mb-2">
            欢迎回来
          </Title>
          <Text className="text-gray-400">登录到 AI 小说创作系统</Text>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input
              prefix={<MailOutlined className="text-gray-400" />}
              placeholder="邮箱"
              size="large"
              className="bg-[rgba(255,255,255,0.05)] border-[rgba(167,139,250,0.2)] text-white"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="密码"
              size="large"
              className="bg-[rgba(255,255,255,0.05)] border-[rgba(167,139,250,0.2)] text-white"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
              className="bg-gradient-to-r from-purple-500 to-pink-500 border-none h-12 text-base"
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center mt-6">
          <Text className="text-gray-400">
            还没有账号？
            <Link to="/register" className="text-purple-400 hover:text-purple-300 ml-1">
              立即注册
            </Link>
          </Text>
        </div>
      </Card>
    </div>
  )
}
