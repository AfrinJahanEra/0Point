# contest/broadcast.py
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging

logger = logging.getLogger(__name__)

def broadcast_contest_update(contest_id, payload):
    """
    Send real-time websocket update to all connected users of this contest.
    
    Args:
        contest_id: The contest ID
        payload: Dictionary containing the data to broadcast
    """
    try:
        channel_layer = get_channel_layer()
        
        if channel_layer is None:
            logger.error("Channel layer is not configured. Check CHANNEL_LAYERS in settings.")
            return False
        
        async_to_sync(channel_layer.group_send)(
            f"contest_{contest_id}",
            {
                "type": "broadcast_update",
                "data": payload
            }
        )
        
        logger.info(f"Broadcast sent to contest_{contest_id}: {payload.get('event', 'unknown')}")
        return True
        
    except Exception as e:
        logger.error(f"Error broadcasting contest update for {contest_id}: {e}")
        return False

def broadcast_global_update(payload):
    """
    Send real-time websocket update to all connected users globally.
    
    Args:
        payload: Dictionary containing the data to broadcast
    """
    try:
        channel_layer = get_channel_layer()
        
        if channel_layer is None:
            logger.error("Channel layer is not configured. Check CHANNEL_LAYERS in settings.")
            return False
        
        async_to_sync(channel_layer.group_send)(
            "contest_global",
            {
                "type": "broadcast_update",
                "data": payload
            }
        )
        
        logger.info(f"Global broadcast sent: {payload.get('event', 'unknown')}")
        return True
        
    except Exception as e:
        logger.error(f"Error broadcasting global update: {e}")
        return False
    
    