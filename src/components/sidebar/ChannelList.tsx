import React from 'react'
import type { ChannelNode } from '@/types'
import ChannelTreeNode from './ChannelTreeNode'

interface ChannelListProps {
channels: ChannelNode[]
}

const ChannelList: React.FC<ChannelListProps> = ({ channels }) => {
return (
<ul className='channel-list'>
{channels.map((channel) => (
<ChannelTreeNode key={channel.id} node={channel} />
))}
</ul>
)
}

export default ChannelList