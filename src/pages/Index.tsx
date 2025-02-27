
import { useState, useEffect, useRef } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import gsap from "gsap";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import confetti from 'canvas-confetti';
import { Award, Star, Check, ThumbsUp } from "lucide-react";

// Define game data types
interface Word {
  id: string;
  content: string;
  correctSlot: string;
}

interface Slot {
  id: string;
  content: string | null;
  prefix: string;
}

const Index = () => {
  // Game state
  const [words, setWords] = useState<Word[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [stars, setStars] = useState(0);
  const [timer, setTimer] = useState(0);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);
  
  // Sound references
  const dragSoundRef = useRef<HTMLAudioElement | null>(null);
  const dropSoundRef = useRef<HTMLAudioElement | null>(null);
  const correctSoundRef = useRef<HTMLAudioElement | null>(null);
  const wrongSoundRef = useRef<HTMLAudioElement | null>(null);
  const starSoundRef = useRef<HTMLAudioElement | null>(null);
  const successSoundRef = useRef<HTMLAudioElement | null>(null);
  
  // Game container ref for animations
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const starsContainerRef = useRef<HTMLDivElement>(null);
  const resultContainerRef = useRef<HTMLDivElement>(null);

  // Initialize game
  useEffect(() => {
    // Create audio elements
    dragSoundRef.current = new Audio("/sounds/drag.mp3");
    dropSoundRef.current = new Audio("/sounds/drop.mp3");
    correctSoundRef.current = new Audio("/sounds/correct.mp3");
    wrongSoundRef.current = new Audio("/sounds/wrong.mp3");
    starSoundRef.current = new Audio("/sounds/star.mp3");
    successSoundRef.current = new Audio("/sounds/success.mp3");
    
    // Preload audio
    const audios = [
      dragSoundRef.current,
      dropSoundRef.current,
      correctSoundRef.current,
      wrongSoundRef.current,
      starSoundRef.current,
      successSoundRef.current
    ];
    
    audios.forEach(audio => {
      if (audio) {
        audio.load();
      }
    });
    
    // Check for best time in local storage
    const storedBestTime = localStorage.getItem("dragGame_bestTime");
    if (storedBestTime) {
      setBestTime(parseInt(storedBestTime));
    }
    
    // Initial animation
    if (gameContainerRef.current) {
      gsap.from(gameContainerRef.current, {
        y: 30,
        opacity: 0,
        duration: 1,
        ease: "power3.out"
      });
    }

    return () => {
      // Clean up timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Reset game
  const resetGame = () => {
    // Initial words in shuffled order
    const initialWords: Word[] = [
      { id: "word-1", content: "felino", correctSlot: "slot-1" },
      { id: "word-2", content: "canino", correctSlot: "slot-2" },
      { id: "word-3", content: "equino", correctSlot: "slot-3" }
    ];
    
    // Shuffle words
    const shuffledWords = [...initialWords]
      .sort(() => Math.random() - 0.5);
    
    // Empty slots
    const initialSlots: Slot[] = [
      { id: "slot-1", content: null, prefix: "Gato é " },
      { id: "slot-2", content: null, prefix: "Cachorro é " },
      { id: "slot-3", content: null, prefix: "Cavalo é " }
    ];
    
    setWords(shuffledWords);
    setSlots(initialSlots);
    setGameComplete(false);
    setShowResults(false);
    setStars(0);
    setScore(0);
    setTimer(0);
    
    // Start timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = window.setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);

    // Animate words
    setTimeout(() => {
      gsap.fromTo(".word-item", 
        { scale: 0, opacity: 0 },
        { 
          scale: 1, 
          opacity: 1, 
          duration: 0.5, 
          stagger: 0.2,
          ease: "back.out(1.7)"
        }
      );
    }, 200);
  };

  // Start game
  const startGame = () => {
    setGameStarted(true);
    resetGame();
    
    // Entrance animation
    gsap.to(".game-title", {
      y: -20,
      scale: 0.8,
      duration: 0.5,
      ease: "back.in"
    });
  };

  // Handle drag start
  const handleDragStart = () => {
    if (dragSoundRef.current) {
      dragSoundRef.current.currentTime = 0;
      dragSoundRef.current.play().catch(e => console.error("Audio play error:", e));
    }
  };

  // Handle drag end - Main game logic
  const handleDragEnd = (result: any) => {
    const { source, destination } = result;
    
    // Dropped outside a droppable area
    if (!destination) return;
    
    // Play drop sound
    if (dropSoundRef.current) {
      dropSoundRef.current.currentTime = 0;
      dropSoundRef.current.play().catch(e => console.error("Audio play error:", e));
    }
    
    // Dropped in words area - rearranging words
    if (source.droppableId === "words" && destination.droppableId === "words") {
      const newWords = [...words];
      const [movedWord] = newWords.splice(source.index, 1);
      newWords.splice(destination.index, 0, movedWord);
      setWords(newWords);
      return;
    }
    
    // Moving from words to slot
    if (source.droppableId === "words" && destination.droppableId.startsWith("slot")) {
      const wordIndex = source.index;
      const slotId = destination.droppableId;
      
      // Get the dragged word
      const draggedWord = words[wordIndex];
      
      // Check if slot is already filled
      const targetSlotIndex = slots.findIndex(slot => slot.id === slotId);
      if (slots[targetSlotIndex].content !== null) {
        // Slot already has content, don't allow
        if (wrongSoundRef.current) {
          wrongSoundRef.current.currentTime = 0;
          wrongSoundRef.current.play().catch(e => console.error("Audio play error:", e));
        }
        
        // Shake animation to indicate slot is filled
        gsap.to(`#${slotId}`, {
          x: [-5, 5, -3, 3, 0],
          duration: 0.4,
          ease: "power2.inOut"
        });
        
        return;
      }
      
      // Check if word is dropped in correct slot
      const isCorrect = draggedWord.correctSlot === slotId;
      
      // Update slots
      const updatedSlots = [...slots];
      updatedSlots[targetSlotIndex] = {
        ...updatedSlots[targetSlotIndex],
        content: draggedWord.content
      };
      
      // Remove word from available words
      const updatedWords = words.filter((_, index) => index !== wordIndex);
      
      setSlots(updatedSlots);
      setWords(updatedWords);
      
      // Correct placement animation and sound
      if (isCorrect) {
        if (correctSoundRef.current) {
          correctSoundRef.current.currentTime = 0;
          correctSoundRef.current.play().catch(e => console.error("Audio play error:", e));
        }
        
        // Celebrate with animation
        gsap.to(`#${slotId} .word-content`, {
          scale: 1.2,
          duration: 0.3,
          yoyo: true,
          repeat: 1,
          ease: "elastic.out(1, 0.3)",
          onComplete: () => {
            // Check stars to award
            const correctCount = updatedSlots.filter(
              (slot, idx) => slot.content && slot.id === `slot-${idx + 1}`
            ).length;
            
            if (correctCount > stars) {
              addStar();
            }
          }
        });
      } else {
        if (wrongSoundRef.current) {
          wrongSoundRef.current.currentTime = 0;
          wrongSoundRef.current.play().catch(e => console.error("Audio play error:", e));
        }
        
        // Wrong placement animation
        gsap.to(`#${slotId} .word-content`, {
          x: [-5, 5, -3, 3, 0],
          duration: 0.4,
          ease: "power2.inOut"
        });
      }
    }
  };

  // Handle double click on a filled slot to return the word
  const handleDoubleClick = (slotId: string) => {
    const slotIndex = slots.findIndex(slot => slot.id === slotId);
    
    // Only if slot has content
    if (slots[slotIndex].content) {
      // Get the content before we clear it
      const wordContent = slots[slotIndex].content;
      
      // Find the word's original details
      const originalWord = [
        { id: "word-1", content: "felino", correctSlot: "slot-1" },
        { id: "word-2", content: "canino", correctSlot: "slot-2" },
        { id: "word-3", content: "equino", correctSlot: "slot-3" }
      ].find(w => w.content === wordContent);
      
      if (originalWord) {
        // Update slots
        const updatedSlots = [...slots];
        updatedSlots[slotIndex] = {
          ...updatedSlots[slotIndex],
          content: null
        };
        
        // Add word back to words list
        const updatedWords = [...words, originalWord];
        
        // Shuffle words again
        const shuffledWords = [...updatedWords].sort(() => Math.random() - 0.5);
        
        // Play sound effect
        if (dragSoundRef.current) {
          dragSoundRef.current.currentTime = 0;
          dragSoundRef.current.play().catch(e => console.error("Audio play error:", e));
        }
        
        // Update state
        setSlots(updatedSlots);
        setWords(shuffledWords);
        
        // Play animation for the returned word
        setTimeout(() => {
          gsap.fromTo(".word-item:last-child", 
            { scale: 0, opacity: 0 },
            { 
              scale: 1, 
              opacity: 1, 
              duration: 0.5,
              ease: "back.out(1.7)"
            }
          );
        }, 100);
      }
    }
  };

  // Add a star with animation
  const addStar = () => {
    const newStars = stars + 1;
    setStars(newStars);
    
    // Play star sound
    if (starSoundRef.current) {
      starSoundRef.current.currentTime = 0;
      starSoundRef.current.play().catch(e => console.error("Audio play error:", e));
    }
    
    // Create and animate a new star
    if (starsContainerRef.current) {
      const starElement = document.createElement("div");
      starElement.className = "absolute star-animation";
      starElement.innerHTML = "⭐";
      starsContainerRef.current.appendChild(starElement);
      
      // Position star randomly
      const xPos = Math.random() * 80 + 10; // 10-90% width
      starElement.style.left = `${xPos}%`;
      
      // Animate star
      gsap.fromTo(starElement, 
        { 
          y: 100, 
          scale: 0,
          opacity: 0,
          rotation: -90
        },
        { 
          y: 0, 
          scale: 1,
          opacity: 1,
          rotation: 0,
          duration: 1,
          ease: "elastic.out(1, 0.3)",
          onComplete: () => {
            gsap.to(starElement, {
              y: -20,
              scale: 1.5,
              opacity: 0,
              duration: 0.5,
              delay: 1,
              onComplete: () => {
                if (starsContainerRef.current?.contains(starElement)) {
                  starsContainerRef.current.removeChild(starElement);
                }
              }
            });
          }
        }
      );
    }
  };

  // Submit answers and show results
  const handleSubmit = () => {
    // Check if all slots are filled
    const allSlotsFilled = slots.every(slot => slot.content !== null);
    
    if (!allSlotsFilled) {
      toast.error("Preencha todas as frases antes de submeter!", {
        description: "Arraste as palavras para completar todas as frases."
      });
      
      // Play wrong sound
      if (wrongSoundRef.current) {
        wrongSoundRef.current.currentTime = 0;
        wrongSoundRef.current.play().catch(e => console.error("Audio play error:", e));
      }
      return;
    }
    
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Calculate score based on correct placements
    const correctPlacements = slots.filter(
      (slot, idx) => slot.content && slot.id === `slot-${idx + 1}`
    ).length;
    
    // Calculate time bonus
    const timeBonus = Math.max(1000 - (timer * 10), 100);
    
    // Calculate star count
    const earnedStars = Math.min(Math.ceil((correctPlacements / 3) * 3), 3);
    
    // Calculate final score
    const finalScore = (correctPlacements * 300) + timeBonus;
    
    setStars(earnedStars);
    setScore(finalScore);
    setGameComplete(true);
    
    // Update best time if needed
    if (correctPlacements === 3 && (bestTime === null || timer < bestTime)) {
      setBestTime(timer);
      localStorage.setItem("dragGame_bestTime", timer.toString());
    }
    
    // Show results screen
    setShowResults(true);
    
    // Play success sound
    if (successSoundRef.current) {
      successSoundRef.current.currentTime = 0;
      successSoundRef.current.play().catch(e => console.error("Audio play error:", e));
    }
    
    // Trigger confetti if score is good
    if (earnedStars >= 2) {
      setTimeout(() => {
        const count = 200;
        const defaults = {
          origin: { y: 0.7 },
          zIndex: 5000
        };

        function fire(particleRatio: number, opts: any) {
          confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio)
          });
        }

        fire(0.25, {
          spread: 26,
          startVelocity: 55,
        });

        fire(0.2, {
          spread: 60,
        });

        fire(0.35, {
          spread: 100,
          decay: 0.91,
          scalar: 0.8
        });

        fire(0.1, {
          spread: 120,
          startVelocity: 25,
          decay: 0.92,
          scalar: 1.2
        });

        fire(0.1, {
          spread: 120,
          startVelocity: 45,
        });
      }, 500);
    }
    
    // Animate results container
    setTimeout(() => {
      if (resultContainerRef.current) {
        gsap.fromTo(resultContainerRef.current,
          { scale: 0.8, opacity: 0 },
          { 
            scale: 1, 
            opacity: 1, 
            duration: 0.8,
            ease: "elastic.out(1, 0.3)"
          }
        );
      }
    }, 100);
  };

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100 p-4"
      ref={gameContainerRef}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 md:p-8 relative overflow-hidden">
        {/* Stars container for animations */}
        <div 
          ref={starsContainerRef} 
          className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
        ></div>
        
        {/* Game title */}
        <h1 className="game-title text-3xl md:text-4xl font-bold text-center mb-8 text-blue-700">
          English Word Match
        </h1>
        
        {!gameStarted ? (
          // Start screen
          <div className="flex flex-col items-center space-y-6">
            <div className="text-center mb-6">
              <p className="text-gray-700 mb-4">
                Arraste as palavras para completar as frases corretamente!
              </p>
              <p className="text-blue-600 font-medium">
                Complete todas as frases para ganhar todas as estrelas!
              </p>
            </div>
            
            <Button 
              onClick={startGame}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 rounded-full text-lg font-medium shadow-lg transition-all hover:shadow-xl hover:scale-105"
            >
              Começar Jogo
            </Button>
            
            {bestTime !== null && (
              <p className="text-sm text-gray-600 mt-2">
                Melhor tempo: {formatTime(bestTime)}
              </p>
            )}
          </div>
        ) : showResults ? (
          // Results screen
          <div 
            ref={resultContainerRef}
            className="flex flex-col items-center justify-center space-y-8 p-4"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold text-blue-700 mb-2 flex items-center justify-center">
                <Award className="w-8 h-8 mr-2 text-yellow-500" />
                Seus Resultados
              </h2>
              
              <p className="text-gray-600 mb-6">
                {stars === 3 ? "Parabéns! Você acertou tudo!" : 
                 stars === 2 ? "Muito bom! Você está quase lá!" : 
                 "Continue praticando para melhorar!"}
              </p>
            </div>
            
            <div className="flex justify-center mb-6">
              {[...Array(3)].map((_, index) => (
                <div key={index} className={`transition-all duration-300 transform ${index < stars ? "scale-110" : "opacity-40"}`}>
                  <Star 
                    className={`w-12 h-12 ${index < stars ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`} 
                  />
                </div>
              ))}
            </div>
            
            <div className="bg-blue-50 p-6 rounded-xl w-full max-w-md">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-blue-100">
                <span className="text-gray-700">Tempo:</span>
                <span className="font-medium text-blue-700">{formatTime(timer)}</span>
              </div>
              
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-blue-100">
                <span className="text-gray-700">Estrelas:</span>
                <span className="font-medium text-blue-700">{stars}/3</span>
              </div>
              
              <div className="flex justify-between items-center text-lg font-bold">
                <span className="text-gray-800">Pontuação:</span>
                <span className="text-blue-700">{score} pontos</span>
              </div>
            </div>
            
            <div className="flex gap-4 mt-6">
              <Button
                onClick={resetGame}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium transition-all hover:scale-105"
              >
                Jogar Novamente
              </Button>
              
              <Button
                onClick={() => setGameStarted(false)}
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50 px-6 py-2 rounded-full font-medium transition-all"
              >
                Menu Principal
              </Button>
            </div>
          </div>
        ) : (
          // Game screen
          <div className="relative">
            {/* Timer display */}
            <div className="absolute top-0 right-0 bg-blue-100 px-3 py-1 rounded-lg text-blue-800 font-medium">
              {formatTime(timer)}
            </div>
            
            {/* Stars display */}
            <div className="absolute top-0 left-0 flex">
              {[...Array(3)].map((_, index) => (
                <span key={index} className="text-2xl transition-all duration-500 transform">
                  {index < stars ? "⭐" : "☆"}
                </span>
              ))}
            </div>
            
            <DragDropContext 
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {/* Slots for dropping words */}
              <div className="mb-8 space-y-4 mt-12">
                {slots.map((slot) => (
                  <div key={slot.id} className="relative">
                    <Droppable droppableId={slot.id}>
                      {(provided, snapshot) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          id={slot.id}
                          className={`
                            flex items-center p-4 rounded-lg transition-all
                            ${snapshot.isDraggingOver ? 'bg-blue-100' : 'bg-blue-50'}
                            ${slot.content ? 'border-2 border-blue-400' : 'border-2 border-blue-200 border-dashed'}
                          `}
                          onDoubleClick={() => handleDoubleClick(slot.id)}
                        >
                          <span className="text-gray-800 font-medium mr-2">{slot.prefix}</span>
                          
                          {slot.content ? (
                            <div className="word-content bg-blue-600 text-white px-4 py-2 rounded-lg font-medium cursor-pointer" title="Duplo clique para remover">
                              {slot.content}
                            </div>
                          ) : (
                            <div className="h-10 w-24 bg-blue-100 rounded-lg border-2 border-blue-200 border-dashed"></div>
                          )}
                          
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                ))}
              </div>
              
              {/* Words to drag */}
              <Droppable droppableId="words" direction="horizontal">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`
                      flex flex-wrap justify-center gap-4 p-4 rounded-lg min-h-16
                      ${snapshot.isDraggingOver ? 'bg-blue-100' : 'bg-blue-50'}
                    `}
                  >
                    {words.map((word, index) => (
                      <Draggable key={word.id} draggableId={word.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`
                              word-item bg-blue-500 text-white px-4 py-2 rounded-lg font-medium shadow-sm
                              ${snapshot.isDragging ? 'shadow-lg scale-105' : ''}
                              cursor-grab active:cursor-grabbing transition-all
                            `}
                            style={{
                              ...provided.draggableProps.style,
                              transform: snapshot.isDragging 
                                ? `${provided.draggableProps.style?.transform} scale(1.05)`
                                : provided.draggableProps.style?.transform
                            }}
                          >
                            {word.content}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            
            {/* Submit button */}
            <div className="mt-8 flex justify-center">
              <Button
                onClick={handleSubmit}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-medium shadow-lg transition-all hover:shadow-xl hover:scale-105 flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                Submeter
              </Button>
            </div>
            
            {/* Instructions */}
            <div className="mt-6 text-center text-sm text-gray-600">
              <p>Arraste as palavras para completar as frases e clique em "Submeter".</p>
              <p className="mt-1 italic">Dica: Você pode dar um duplo clique nas palavras já colocadas para retirá-las.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
