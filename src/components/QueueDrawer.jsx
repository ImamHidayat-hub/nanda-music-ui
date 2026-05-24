import React from 'react';
import { X, Play } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableTrack = ({ song, index, isActive }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-3 p-3 rounded-xl touch-none cursor-grab active:cursor-grabbing transition-colors ${isDragging ? 'bg-[#333] shadow-2xl scale-105' : 'hover:bg-[#282828]'}`}
    >
      <div className="w-10 h-10 flex-shrink-0 relative overflow-hidden rounded-md bg-[#1a1a1a]">
        <img src={song.thumbnail} alt={song.title} className="w-full h-full object-cover" />
        {isActive && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
            {/* Simple Animated EQ Icon */}
            <div className="flex gap-[2px] items-end h-3">
              <div className="w-[3px] bg-green-500 animate-[eq_0.8s_ease-in-out_infinite_alternate] h-full"></div>
              <div className="w-[3px] bg-green-500 animate-[eq_1.2s_ease-in-out_infinite_alternate] h-2/3"></div>
              <div className="w-[3px] bg-green-500 animate-[eq_0.6s_ease-in-out_infinite_alternate] h-full"></div>
            </div>
          </div>
        )}
      </div>
      <div className="flex-col flex-1 overflow-hidden">
        <h4 className={`text-sm font-semibold truncate ${isActive ? 'text-green-500' : 'text-white'}`}>{song.title}</h4>
        <p className="text-xs text-gray-400 truncate">{song.artist}</p>
      </div>
      <div className="text-gray-500 text-xs">{isActive ? 'Playing' : ''}</div>
    </div>
  );
};

const QueueDrawer = ({ isOpen, setIsOpen, isPlayerExpanded }) => {
  const { queue, currentIndex, onDragEnd, currentSong } = usePlayer();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 5 } })
  );

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-y-0 right-0 w-full md:w-96 bg-[#181818] shadow-2xl border-l border-[#282828] transform transition-transform duration-300 ease-in-out z-[90] flex flex-col ${isPlayerExpanded ? 'md:z-[100]' : ''}`}>
      <div className="p-6 border-b border-[#282828] flex justify-between items-center bg-[#181818] sticky top-0 z-10">
        <h2 className="text-xl font-bold text-white">Up Next</h2>
        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-[#282828] transition">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {queue.length > 0 ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={queue.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1">
                {queue.map((song, index) => (
                  <SortableTrack key={song.id} song={song} index={index} isActive={index === currentIndex} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p>Antrean kosong</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueueDrawer;
